import os, json
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI

# Load env
load_dotenv(".env.local")
NEXT_PUBLIC_SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

sb = create_client(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
client = OpenAI(api_key=OPENAI_API_KEY)

def detect_and_translate(text: str) -> str:
    """Uses LLM to detect if text is English and translate if so."""
    if not text or len(text) < 5: 
        return text

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional translator for a manufacturing glossary. Translate the following text to Spanish ONLY if it is in English. If it is already in Spanish, return it exactly as is (do not change a single character). Return only the translated or original text, no explanations."},
                {"role": "user", "content": text}
            ],
            temperature=0
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error translating: {e}")
        return text

def process_table(table_name, column_name):
    print(f"--- Processing {table_name} ---")
    
    # 1. Fetch all rows
    page = 0
    limit = 100
    
    table_clean = table_name.split(".")[-1]
    
    while True:
        offset = page * limit
        data = sb.schema("learning").table(table_clean).select("id, " + column_name).range(offset, offset + limit - 1).execute().data
        
        if not data:
            break
            
        print(f"Processing batch {page + 1} ({len(data)} rows)...")
        
        for row in data:
            original_text = row.get(column_name)
            if not original_text: continue
            
            translated_text = detect_and_translate(original_text)
            
            if translated_text != original_text:
                print(f"Translating: {original_text[:50]}... -> {translated_text[:50]}...")
                sb.schema("learning").table(table_clean).update({column_name: translated_text}).eq("id", row["id"]).execute()
            # else:
            #     print(f"Skipping (already Spanish): {original_text[:30]}...")
                
        page += 1

if __name__ == "__main__":
    print("Starting Translation...")
    process_table("learning.concepts", "definition")
    process_table("learning.tools", "purpose")
    # Formulas and Procedures are complex types (arrays/json), skipping simple string translation for now.
    
    print("Done!")
