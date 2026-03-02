import os, json
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI

load_dotenv(".env.local")

NEXT_PUBLIC_SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

sb = create_client(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
ai = OpenAI(api_key=OPENAI_API_KEY)

DOMAINS_TO_FILL_CONCEPTS = [
  {"slug": "kaizen", "name": "Concepto Fundamental de Kaizen", "desc": "Filosofía orientada a buscar perfeccionamiento continuo involucrando a todos los empleados."},
  {"slug": "5s", "name": "Concepto Fundamental de 5S", "desc": "Metodología para organizar, limpiar, mantener y estandarizar el área de trabajo (Seiri, Seiton, Seiso, Seiketsu, Shitsuke)."},
  {"slug": "gemba", "name": "Concepto Fundamental de Gemba", "desc": "Ir al lugar real donde ocurre la acción o donde se crea valor (el piso de producción o área de trabajo)."},
  {"slug": "formacion", "name": "Concepto Fundamental de Formación", "desc": "Procesos de entrenamiento industrial."},
  {"slug": "procedimientos", "name": "Procedimientos Estándar", "desc": "Creación y seguimiento de trabajo estandarizado."},
  {"slug": "innovacion", "name": "Innovación", "desc": "Nuevas ideas y propuestas."},
  {"slug": "monitoring", "name": "Monitoreo", "desc": "Seguimiento y control de indicadores operativos."},
  {"slug": "gestión", "name": "Gestión Operativa", "desc": "Administración del piso de producción."},
  {"slug": "proceso", "name": "Optimización de Procesos", "desc": "Mejora del flujo y secuencias."},
  {"slug": "control", "name": "Control", "desc": "Supervisión de variables métricas."},
  {"slug": "educacion", "name": "Educación", "desc": "Desarrollo y educación continua."},
  {"slug": "toyota_leadership", "name": "Liderazgo Estilo Toyota", "desc": "Desarrollo de líderes como maestros y mentores."},
  {"slug": "gestión-visual", "name": "Gestión Visual", "desc": "Aplicación de controles visuales y andon."}
]

def ensure_basic_concept(domain_id: str, concept_name: str, concept_desc: str) -> str:
    res = sb.rpc("upsert_concept_rpc", {
        "_domain_id": domain_id, 
        "_name": concept_name, 
        "_definition": concept_desc, 
        "_aliases": [], 
        "_tags": ["fundamental"]
    }).execute()
    return res.data

def get_null_concept_items():
    print("Fetching items with null concept_id...")
    response = sb.schema("learning").table("items").select("id, domain_id, prompt").is_("concept_id", "null").execute()
    return response.data

def get_domain_concepts(domain_id: str):
    response = sb.schema("learning").table("concepts").select("id, name, definition").eq("domain_id", domain_id).execute()
    return response.data

def get_domains():
    response = sb.schema("learning").table("domains").select("id, slug").execute()
    return {d["slug"]: d["id"] for d in response.data}


def link_items():
    # 1. Ensure basic concepts exist for empty domains
    domains_map = get_domains()
    print("1. Filling basic concepts for empty domains...")
    for d in DOMAINS_TO_FILL_CONCEPTS:
        domain_id = domains_map.get(d["slug"])
        if domain_id:
            # Check if domain has concepts
            existing = get_domain_concepts(domain_id)
            if not existing:
                ensure_basic_concept(domain_id, d["name"], d["desc"])
                print(f"Created basic concept for {d['slug']}")

    # 2. Get items and concepts mapped
    items = get_null_concept_items()
    if not items:
        print("No items with null concept_id found!")
        return

    print(f"2. Found {len(items)} items to process.")
    
    # Pre-fetch and cache concepts per domain
    domain_to_concepts = {}
    
    # Counters
    success = 0
    errors = 0
    mapped_by_single_concept = 0
    mapped_by_ai = 0

    for i, item in enumerate(items):
        item_id = item["id"]
        domain_id = item["domain_id"]
        prompt_text = item["prompt"]
        
        # We need a domain_id to proceed
        if not domain_id:
            continue
            
        if domain_id not in domain_to_concepts:
            domain_to_concepts[domain_id] = get_domain_concepts(domain_id)
            
        concepts = domain_to_concepts[domain_id]
        
        if not concepts:
            print(f"Warning: Domain {domain_id} still has no concepts.")
            continue
            
        assigned_concept_id = None
        
        # IF ONLY 1 CONCEPT IN DOMAIN: auto assign, save AI tokens and time.
        if len(concepts) == 1:
            assigned_concept_id = concepts[0]["id"]
            mapped_by_single_concept += 1
        else:
            # LLM MATCHING
            options_text = "\\n".join([f"- ID: {c['id']} | Name: {c['name']} | Def: {c['definition']}" for c in concepts])
            ai_prompt = (
                f"You have the following assessment question:\n\"{prompt_text}\"\n\n"
                f"Match it to the BEST fitting concept from the list below. Return ONLY the concept 'ID' string as plain text. No markdown, no quotes.\n\n"
                f"CONCEPTS:\n{options_text}"
            )
            try:
                ai_resp = ai.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": ai_prompt}],
                    temperature=0.0
                )
                predicted_id = ai_resp.choices[0].message.content.strip()
                # Validate if it's a real concept id in the list
                if any(c["id"] == predicted_id for c in concepts):
                    assigned_concept_id = predicted_id
                    mapped_by_ai += 1
                else:
                    # Fallback to the first one just in case the AI hallucinates, it's better than null
                    assigned_concept_id = concepts[0]["id"]
            except Exception as e:
                print(f"AI Match error on item {item_id}: {e}")
                assigned_concept_id = concepts[0]["id"] # Fallback
                
        if assigned_concept_id:
            try:
                sb.schema("learning").table("items").update({"concept_id": assigned_concept_id}).eq("id", item_id).execute()
                success += 1
                if success % 10 == 0:
                    print(f"Progress: {success}/{len(items)} items updated...")
            except Exception as e:
                errors += 1
                print(f"Failed to update item {item_id}: {e}")

    print("\n--- LINKING COMPLETE ---")
    print(f"Total Updated Successfully: {success} ({mapped_by_single_concept} fast-assigned, {mapped_by_ai} AI-assigned)")
    print(f"Errors: {errors}")


if __name__ == "__main__":
    link_items()
