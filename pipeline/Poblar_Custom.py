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

DOMAINS_TO_FILL = [
  {"slug": "kaizen", "name": "Kaizen / Mejora Continua", "description": "Filosofía orientada a buscar perfeccionamiento continuo involucrando a todos los empleados."},
  {"slug": "5s", "name": "5S", "description": "Metodología para organizar, limpiar, mantener y estandarizar el área de trabajo (Seiri, Seiton, Seiso, Seiketsu, Shitsuke)."},
  {"slug": "gemba", "name": "Gemba", "description": "Ir al lugar real donde ocurre la acción o donde se crea valor (el piso de producción o área de trabajo)."}
]

ITEMS_SCHEMA = {
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "prompt": {"type": "string"},
          "item_type": {"type": "string", "enum": ["mcq", "case"]},
          "options": {"type": "array", "items": {"type":"string"}},
          "correct_answer": {"type": "string"},
          "explanation": {"type": "string"},
          "knowledge_type": {"type": "string", "enum": ["F", "C", "P", "M"]},
          "cognitive_level": {"type": "string", "enum": ["Recordar", "Comprender", "Aplicar", "Analizar"]},
          "difficulty": {"type": "integer"}
        },
        "required": ["prompt","item_type","options","correct_answer","explanation","knowledge_type","cognitive_level","difficulty"],
        "additionalProperties": False
      }
    }
  },
  "required": ["items"],
  "additionalProperties": False
}

def ensure_domain(domain_slug: str, domain_name: str) -> str:
    r = sb.rpc("upsert_domain_rpc", {
        "_slug": domain_slug,
        "_name": domain_name,
        "_description": ""
    }).execute()
    return r.data

def generate_direct_items(domain_slug: str, domain_desc: str):
    print(f"\n--- Generating 15 items direct for: {domain_slug} ---")
    
    prompt = (
        f"Actúa como un experto en manufactura esbelta (Lean).\n"
        f"Genera exactamente 15 preguntas de evaluación para el dominio: {domain_slug} ({domain_desc}).\n"
        "REGLAS:\n"
        "1) Combina 'mcq' (opción múltiple teórica o de aplicación rápida) y 'case' (casos de estudio de 1 párrafo resolviendo un problema industrial).\n"
        "2) TODOS los ítems DEBEN tener un arreglo 'options' con exactamente 4 opciones de respuesta.\n"
        "3) correct_answer debe ser el TEXTO exacto de una de las opciones.\n"
        "4) knowledge_type puede ser F (Factual), C (Conceptual), P (Procedimental), M (Metacognitivo).\n"
        "5) cognitive_level puede ser Recordar, Comprender, Aplicar, Analizar.\n"
        "6) difficulty del 1 al 5.\n"
    )
    
    try:
        resp = ai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": "Lean Assessment Generator"}, {"role": "user", "content": prompt}],
            response_format={"type": "json_schema", "json_schema": {"name": "gen_direct_items", "schema": ITEMS_SCHEMA, "strict": True}}
        )
        data = json.loads(resp.choices[0].message.content)
        items = data.get("items", [])
        return items
    except Exception as e:
        print(f"Item Gen Error: {e}")
        return []

def main():
    for dom in DOMAINS_TO_FILL:
        did = ensure_domain(dom["slug"], dom["name"])
        items = generate_direct_items(dom["slug"], dom["description"])
        
        saved_count = 0
        for item in items:
            try:
                sb.rpc("upsert_item_rpc", {
                    "_skill_id": None,
                    "_domain_id": did,
                    "_prompt": item["prompt"],
                    "_item_type": item["item_type"],
                    "_options": item["options"],
                    "_correct_answer": json.dumps(item["correct_answer"]),
                    "_explanation": item["explanation"],
                    "_knowledge_type": item["knowledge_type"],
                    "_cognitive_level": item["cognitive_level"],
                    "_difficulty": item["difficulty"],
                    "_concept_id": None
                }).execute()
                saved_count += 1
            except Exception as e:
                print(f"Error saving item: {e}")
        
        print(f"Successfully saved {saved_count} items for {dom['slug']}")

if __name__ == "__main__":
    main()
