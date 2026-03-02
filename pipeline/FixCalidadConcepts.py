import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.local")

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise ValueError("Missing Supabase credentials in .env.local")

supabase: Client = create_client(url, key)

async def fix_calidad_concepts():
    print("Fetching concepts from 'Calidad' domain...")
    
    # Get Calidad Domain ID
    domain_res = supabase.schema("learning").table("domains").select("id").eq("slug", "calidad").execute()
    if not domain_res.data:
        print("Calidad domain not found.")
        return
        
    calidad_id = domain_res.data[0]['id']
    
    # 1. DELETE completely irrelevant items (Agriculture, Water, Real Estate, Medical, etc)
    concepts_to_delete = [
        "Energy Savings from Efficiency",
        "Renewable Energy",
        "Rainwater Harvesting",
        "Graywater Reuse",
        "Water Efficiency",
        "Efectos de la agricultura industrializada",
        "Pérdida de la riqueza orgánica del suelo",
        "Degradación del suelo",
        "Ecosystem Services",
        "Natural Capital",
        "Calefacción Pasiva",
        "Energía Eficiente",
        "Energy Efficiency",
        "Superwindows",
        "Calidad de vida",
        "Reciclaje de latas de aluminio",
        "Sistema Logístico Hospitalario (SLH)",
        "VBID (Value-Based Insurance Design)",
        "Teoría de mercados perfectos",
        "Estación Tubo", # Not a lean concept?
    ]
    
    print(f"Deleting {len(concepts_to_delete)} irrelevant concepts...")
    for c_name in concepts_to_delete:
        res = supabase.schema("learning").table("concepts").delete().eq("domain_id", calidad_id).eq("name", c_name).execute()
        if res.data:
             print(f" - Deleted: {c_name}")
             
    # 2. Re-assign other leaning concepts if needed.
    # Ex: Mura -> to Mura domain
    print("Reassigning correctly to their actual domains if they exist...")
    
    reassignments = {
        "Muda": "muda",
        "Mura": "mura",
        "Muri": "muri",
        "Muda de sobreproducción": "muda",
        "Muda de existencias": "muda",
        "Muda de artículos defectuosos": "muda",
        "Muda de movimiento": "muda",
        "Muda de procesamiento": "muda",
        "Muda de espera": "muda",
        "Muda de transporte": "muda",
        "Categorías de Muda": "muda",
        "Tres M (3M)": "muda",
        "Muda, Mura y Muri": "muda",
        "5S": "5s",
        "Gemba": "gemba",
        "Kaizen": "kaizen",
        "kaizen": "kaizen",
        "Gemba Kaizen": "kaizen",
        "Just-in-Time": "just-in-time",
        "Sistema de producción just in time (JIT)": "just-in-time",
        "Sistema de producción Just in Time (JIT)": "just-in-time"
    }
    
    from postgrest.exceptions import APIError
    
    for concept_name, target_domain_slug in reassignments.items():
        # Get target domain id
        target_domain_res = supabase.schema("learning").table("domains").select("id").eq("slug", target_domain_slug).execute()
        if target_domain_res.data:
            target_domain_id = target_domain_res.data[0]['id']
            # Reassign
            try:
                update_res = supabase.schema("learning").table("concepts").update({"domain_id": target_domain_id}).eq("domain_id", calidad_id).eq("name", concept_name).execute()
                if update_res.data:
                     print(f" - Reassigned '{concept_name}' to '{target_domain_slug}'")
            except APIError as e:
                if '23505' in str(e): # Duplicate key
                    print(f" - Concept '{concept_name}' already exists in '{target_domain_slug}'. Deleting from Calidad instead.")
                    supabase.schema("learning").table("concepts").delete().eq("domain_id", calidad_id).eq("name", concept_name).execute()
                else:
                    raise e
                 

    print("Cleanup process completed.")
    
if __name__ == "__main__":
    asyncio.run(fix_calidad_concepts())
