import os
import json
import time
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI

# Load local environment variables
load_dotenv(".env.local")

NEXT_PUBLIC_SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not NEXT_PUBLIC_SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY or not OPENAI_API_KEY:
    print("Missing required environment variables. Check .env.local")
    exit(1)

sb = create_client(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
ai = OpenAI(api_key=OPENAI_API_KEY)

def get_documents_without_embedding(limit=50):
    try:
        # Fetch rows where embedding is null
        resp = sb.table("documentos_certificacion").select("id, contenido").filter("embedding", "is", "null").limit(limit).execute()
        return resp.data
    except Exception as e:
        print(f"Error fetching documents: {e}")
        return []

def generate_embedding(text):
    try:
        response = ai.embeddings.create(
            input=text,
            model="text-embedding-3-small", 
            dimensions=1536
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

def update_document_embedding(doc_id, embedding):
    try:
        # Update the document with the new vector
        sb.table("documentos_certificacion").update({"embedding": embedding}).eq("id", doc_id).execute()
        return True
    except Exception as e:
        print(f"Error updating document {doc_id}: {e}")
        return False

def run_embeddings_pipeline():
    print("Starting Embeddings Pipeline...")
    total_processed = 0
    batch_size = 50
    
    while True:
        docs = get_documents_without_embedding(limit=batch_size)
        
        if not docs:
            print(f"Finished. No more documents without embeddings found. Total processed: {total_processed}")
            break
            
        print(f"Processing batch of {len(docs)} documents...")
        
        for doc in docs:
            doc_id = doc["id"]
            contenido = doc["contenido"]
            
            # Simple text cleaning before embedding
            clean_text = contenido.replace("\n", " ").strip()
            if not clean_text:
                continue
                
            vector = generate_embedding(clean_text)
            
            if vector:
                success = update_document_embedding(doc_id, vector)
                if success:
                    total_processed += 1
                    
        # Small delay to respect rate limits
        time.sleep(1)

if __name__ == "__main__":
    run_embeddings_pipeline()
