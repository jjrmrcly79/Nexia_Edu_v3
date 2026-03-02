import os, json, hashlib, time
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI

load_dotenv(".env.local")

NEXT_PUBLIC_SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

sb = create_client(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
ai = OpenAI(api_key=OPENAI_API_KEY)

# ---------- helpers ----------
def get_unprocessed_chunks(limit=20):
    resp = sb.rpc("get_unprocessed_chunks_rpc", {"_limit": limit}).execute()
    return resp.data or []

def mark_chunks_processed(chunk_ids: list, batch_id: str):
    if not chunk_ids:
        return
    sb.rpc("mark_chunks_processed_rpc", {
        "_ids": chunk_ids, 
        "_batch_id": batch_id
    }).execute()

def ensure_domain(domain_slug: str) -> str:
    # Mapeo simple
    name_map = {
        "flujo": "Flujo",
        "calidad": "Calidad",
        "cambio-rapido": "Cambio Rápido (SMED)",
        "pull": "Pull / Kanban",
        "estabilidad": "Estabilidad / 5S",
        "liderazgo": "Liderazgo Lean",
        "mejora": "Mejora Continua (Kaizen)"
    }
    name = name_map.get(domain_slug, domain_slug.replace("-", " ").title())
    
    r = sb.rpc("upsert_domain_rpc", {
        "_slug": domain_slug,
        "_name": name,
        "_description": ""
    }).execute()
    return r.data

def insert_evidence_link(chunk_id: str, entity_type: str, entity_id: str, quote: str, relevance: float = 0.7):
    sb.rpc("insert_evidence_link_rpc", {
        "_chunk_id": chunk_id,
        "_entity_type": entity_type,
        "_entity_id": entity_id,
        "_quote": quote[:500],
        "_relevance": relevance
    }).execute()

# ---------- 1. Entity Extraction ----------
EXTRACT_SCHEMA = {
  "type": "object",
  "properties": {
    "concepts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "domain_slug": {"type": "string"},
          "name": {"type": "string"},
          "definition": {"type": "string"},
          "aliases": {"type": "array", "items": {"type": "string"}},
          "tags": {"type": "array", "items": {"type": "string"}},
          "evidence": {
            "type": "array",
            "items": { "type": "object", "properties": { "chunk_id": {"type": "string"}, "quote": {"type": "string"} }, "required": ["chunk_id", "quote"], "additionalProperties": False }
          },
          "confidence": {"type": "number"}
        },
        "required": ["domain_slug","name","definition","aliases","tags","evidence","confidence"],
        "additionalProperties": False
      }
    },
    "tools": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "domain_slug": {"type": "string"},
          "name": {"type": "string"},
          "purpose": {"type": "string"},
          "when_to_use": {"type": "string"},
          "outputs": {"type": "array", "items": {"type": "string"}},
          "evidence": { "type": "array", "items": { "type": "object", "properties": { "chunk_id": {"type": "string"}, "quote": {"type": "string"} }, "required": ["chunk_id", "quote"], "additionalProperties": False } },
          "confidence": {"type": "number"}
        },
        "required": ["domain_slug","name","purpose","when_to_use","outputs","evidence","confidence"],
        "additionalProperties": False
      }
    },
    "formulas": {
      "type":"array",
      "items":{
        "type":"object",
        "properties":{
          "domain_slug":{"type":"string"},
          "name":{"type":"string"},
          "expression_latex":{"type":"string"},
          "variables":{ "type":"array", "items": { "type": "object", "properties": { "symbol": {"type": "string"}, "description": {"type": "string"} }, "required": ["symbol", "description"], "additionalProperties": False } }, 
          "assumptions":{"type":"string"},
          "example":{"type":"string"},
          "evidence": { "type": "array", "items": { "type": "object", "properties": { "chunk_id": {"type": "string"}, "quote": {"type": "string"} }, "required": ["chunk_id", "quote"], "additionalProperties": False } },
          "confidence":{"type":"number"}
        },
        "required":["domain_slug","name","expression_latex","variables","assumptions","example","evidence","confidence"],
        "additionalProperties": False
      }
    },
    "procedures":{
      "type":"array",
      "items":{
        "type":"object",
        "properties":{
          "domain_slug":{"type":"string"},
          "name":{"type":"string"},
          "steps":{ "type":"array", "items":{ "type":"object", "properties": { "text": {"type": "string"} }, "required": ["text"], "additionalProperties": False } },
          "checklist":{ "type":"array", "items":{ "type":"object", "properties": { "item": {"type": "string"} }, "required": ["item"], "additionalProperties": False } },
          "common_mistakes":{ "type":"array", "items":{ "type":"object", "properties": { "mistake": {"type": "string"} }, "required": ["mistake"], "additionalProperties": False } },
          "evidence": { "type": "array", "items": { "type": "object", "properties": { "chunk_id": {"type": "string"}, "quote": {"type": "string"} }, "required": ["chunk_id", "quote"], "additionalProperties": False } },
          "confidence":{"type":"number"}
        },
        "required":["domain_slug","name","steps","checklist","common_mistakes","evidence","confidence"],
        "additionalProperties": False
      }
    }
  },
  "required": ["concepts","tools","formulas","procedures"],
  "additionalProperties": False
}

def extract_entities(chunks: list[dict]) -> dict:
    pack = [{"chunk_id": c["id"], "text": c["contenido"]} for c in chunks]
    prompt = (
        "Eres un experto en Lean Manufacturing / Educación.\n"
        "Convierte texto en entidades estructuradas.\n"
        "REGLAS:\n"
        "1) Extrae Conceptos, Herramientas, Fórmulas y Procedimientos.\n"
        "2) Cita la EVIDENCIA exacta (chunk_id + quote).\n"
        "3) Usa domain_slug simples (flujo, calidad, etc).\n"
        "4) Solo incluye items con alta confianza.\n"
        f"CHUNKS:\n{json.dumps(pack, ensure_ascii=False)[:50000]}"
    )
    try:
        resp = ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": "Assistant extraction bot."}, {"role": "user", "content": prompt}],
            response_format={"type": "json_schema", "json_schema": {"name": "extract_ent", "schema": EXTRACT_SCHEMA, "strict": True}}
        )
        return json.loads(resp.choices[0].message.content)
    except Exception as e:
        print(f"Entities Ext Error: {e}")
        return {}

def save_entities(data: dict):
    # Save Concepts
    for c in data.get("concepts", []):
        if c["confidence"] < 0.7: continue
        try:
            did = ensure_domain(c["domain_slug"])
            eid = sb.rpc("upsert_concept_rpc", {
                "_domain_id": did, "_name": c["name"], "_definition": c["definition"], 
                "_aliases": c.get("aliases", []), "_tags": c.get("tags", [])
            }).execute().data
            for ev in c["evidence"]: insert_evidence_link(ev["chunk_id"], "concept", eid, ev["quote"])
        except Exception as e: print(f"Err C {c['name']}: {e}")

    # Save Tools
    for t in data.get("tools", []):
        if t["confidence"] < 0.7: continue
        try:
            did = ensure_domain(t["domain_slug"])
            eid = sb.rpc("upsert_tool_rpc", {
                "_domain_id": did, "_name": t["name"], "_purpose": t["purpose"], 
                "_when_to_use": t["when_to_use"], "_outputs": t.get("outputs", [])
            }).execute().data
            for ev in t["evidence"]: insert_evidence_link(ev["chunk_id"], "tool", eid, ev["quote"])
        except Exception as e: print(f"Err T {t['name']}: {e}")

    # Save Formulas
    for f in data.get("formulas", []):
        if f["confidence"] < 0.7: continue
        try:
            did = ensure_domain(f["domain_slug"])
            eid = sb.rpc("upsert_formula_rpc", {
                "_domain_id": did, "_name": f["name"], "_expression_latex": f["expression_latex"],
                "_variables": f.get("variables", []), "_assumptions": f.get("assumptions",""), "_example": f.get("example","")
            }).execute().data
            for ev in f["evidence"]: insert_evidence_link(ev["chunk_id"], "formula", eid, ev["quote"])
        except Exception as e: print(f"Err F {f['name']}: {e}")

    # Save Procedures
    for p in data.get("procedures", []):
        if p["confidence"] < 0.7: continue
        try:
            did = ensure_domain(p["domain_slug"])
            eid = sb.rpc("upsert_procedure_rpc", {
                "_domain_id": did, "_name": p["name"], "_steps": p.get("steps", []),
                "_checklist": p.get("checklist", []), "_common_mistakes": p.get("common_mistakes", [])
            }).execute().data
            for ev in p["evidence"]: insert_evidence_link(ev["chunk_id"], "procedure", eid, ev["quote"])
        except Exception as e: print(f"Err P {p['name']}: {e}")


# ---------- 2. Item Generation ----------
ITEMS_SCHEMA = {
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "domain_slug": {"type": "string"},
          "prompt": {"type": "string"},
          "item_type": {"type": "string", "enum": ["mcq", "case"]},
          "options": {"type": "array", "items": {"type":"string"}},
          "correct_answer": {"type": "string"},
          "explanation": {"type": "string"},
          "knowledge_type": {"type": "string", "enum": ["F", "C", "P", "M"]},
          "cognitive_level": {"type": "string", "enum": ["Recordar", "Comprender", "Aplicar", "Analizar"]},
          "difficulty": {"type": "integer"},
          "confidence": {"type": "number"}
        },
        "required": ["domain_slug","prompt","item_type","options","correct_answer","explanation","knowledge_type","cognitive_level","difficulty","confidence"],
        "additionalProperties": False
      }
    }
  },
  "required": ["items"],
  "additionalProperties": False
}

def generate_items(chunks: list[dict]):
    pack = [{"chunk_id": c["id"], "text": c["contenido"]} for c in chunks]
    prompt = (
        "Genera preguntas de evaluación (Items) basadas EXCLUSIVAMENTE en el texto.\n"
        "REGLAS:\n"
        "1) Genera 3-5 preguntas tipo MCQ (Multiple Choice) o Case Study.\n"
        "2) IMPORTANTE: TODOS los ítems (incluyendo Case Study) DEBEN tener un arreglo 'options' con 3 o 4 opciones de respuesta (opción múltiple).\n"
        "3) Deben probar 'knowledge_type' y 'cognitive_level'.\n"
        "4) correct_answer debe ser el TEXTO exacto de una de las opciones.\n"
        "5) Solo si el texto da suficiente info.\n"
        f"CHUNKS:\n{json.dumps(pack, ensure_ascii=False)[:30000]}"
    )
    try:
        resp = ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": "Assessment generator."}, {"role": "user", "content": prompt}],
            response_format={"type": "json_schema", "json_schema": {"name": "gen_items", "schema": ITEMS_SCHEMA, "strict": True}}
        )
        return json.loads(resp.choices[0].message.content)
    except Exception as e:
        print(f"Item Gen Error: {e}")
        return {}

def save_items(data: dict):
    for item in data.get("items", []):
        if item["confidence"] < 0.7: continue
        try:
            did = ensure_domain(item["domain_slug"])
            sb.rpc("upsert_item_rpc", {
                "_skill_id": None, # Linked later or manually
                "_domain_id": did,
                "_prompt": item["prompt"],
                "_item_type": item["item_type"],
                "_options": item["options"],
                "_correct_answer": json.dumps(item["correct_answer"]),
                "_explanation": item["explanation"],
                "_knowledge_type": item["knowledge_type"],
                "_cognitive_level": item["cognitive_level"],
                "_difficulty": item["difficulty"]
            }).execute()
        except Exception as e:
            print(f"Err Item save: {e}")


# ---------- Main Loop ----------
def run_pipeline():
    print("Starting pipeline... loop until no unprocessed chunks.")
    batch_size = 10 # Smaller batch for dual-pass
    
    while True:
        # 1. Fetch
        chunks = get_unprocessed_chunks(limit=batch_size)
        if not chunks:
            print("No unprocessed chunks found. Sleeping 60s...")
            time.sleep(60)
            continue
            
        print(f"Processing batch of {len(chunks)} chunks...")
        batch_id = f"batch_{int(time.time())}"
        
        # 2. Extract Entities
        try:
            ent_data = extract_entities(chunks)
            if ent_data:
                save_entities(ent_data)
                print(f"  > Entities extracted & saved.")
        except Exception as e:
            print(f"  ! Entity pass failed: {e}")

        # 3. Generate Items
        try:
            item_data = generate_items(chunks)
            if item_data:
                save_items(item_data)
                print(f"  > Items generated & saved.")
        except Exception as e:
             print(f"  ! Item pass failed: {e}")
        
        # 4. Mark Processed
        c_ids = [c["id"] for c in chunks]
        mark_chunks_processed(c_ids, batch_id)
        print(f"  > Batch marked processed (IDs: {len(c_ids)}).")
        
        time.sleep(1) # Rate limit safe

# ---------- 3. Item Generation from Concepts ----------
def get_concepts_for_gen(limit=5):
    resp = sb.rpc("get_concepts_for_generation_rpc", {"_limit": limit}).execute()
    return resp.data or []

def generate_items_from_concepts(concepts: list[dict]):
    if not concepts: return {}
    
    # Create a dense prompt with all concepts
    concepts_text = "\n".join([
        f"- ID: {c['id']}\n  Domain: {c['domain_slug']}\n  Concept: {c['name']}\n  Definition: {c['definition']}\n"
        for c in concepts
    ])

    prompt = (
        "Genera preguntas de evaluación (Items) basadas EXCLUSIVAMENTE en los conceptos provistos.\n"
        "REGLAS:\n"
        "1) Genera 3 preguntas por cada concepto (1 MCQ Concept, 1 MCQ Apply, 1 Case Study).\n"
        "2) IMPORTANTE: TODOS los ítems (incluyendo Case Study) DEBEN tener un arreglo 'options' con 3 o 4 opciones de respuesta (opción múltiple).\n"
        "3) Deben probar 'knowledge_type' y 'cognitive_level'.\n"
        "4) correct_answer debe ser el TEXTO exacto de una de las opciones.\n"
        "5) Usa el 'concept_id' provisto para vincular.\n"
        f"CONCEPTOS:\n{concepts_text}"
    )
    
    # Update Schema to include concept_id
    ITEMS_FROM_CONCEPTS_SCHEMA = {
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "concept_id": {"type": "string"},
              "domain_slug": {"type": "string"},
              "prompt": {"type": "string"},
              "item_type": {"type": "string", "enum": ["mcq", "case"]},
              "options": {"type": "array", "items": {"type":"string"}},
              "correct_answer": {"type": "string"},
              "explanation": {"type": "string"},
              "knowledge_type": {"type": "string", "enum": ["F", "C", "P", "M"]},
              "cognitive_level": {"type": "string", "enum": ["Recordar", "Comprender", "Aplicar", "Analizar"]},
              "difficulty": {"type": "integer"},
              "confidence": {"type": "number"}
            },
            "required": ["concept_id", "domain_slug","prompt","item_type","options","correct_answer","explanation","knowledge_type","cognitive_level","difficulty","confidence"],
            "additionalProperties": False
          }
        }
      },
      "required": ["items"],
      "additionalProperties": False
    }

    try:
        resp = ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": "Assessment generator."}, {"role": "user", "content": prompt}],
            response_format={"type": "json_schema", "json_schema": {"name": "gen_items_conc", "schema": ITEMS_FROM_CONCEPTS_SCHEMA, "strict": True}}
        )
        return json.loads(resp.choices[0].message.content)
    except Exception as e:
        print(f"Item Gen Conc Error: {e}")
        return {}

def save_items_linked(data: dict):
    for item in data.get("items", []):
        if item["confidence"] < 0.7: continue
        try:
            # We assume domain exists since it came from concept
            did = ensure_domain(item["domain_slug"])
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
                "_concept_id": item["concept_id"]
            }).execute()
        except Exception as e:
            print(f"Err Item Linked save: {e}")

def run_concepts_pipeline():
    print("Starting Concepts -> Items pipeline...")
    batch_size = 5
    
    while True:
        concepts = get_concepts_for_gen(limit=batch_size)
        if not concepts:
            print("No concepts needing items found. Sleeping 60s...")
            time.sleep(60)
            continue
            
        print(f"Processing batch of {len(concepts)} concepts...")
        
        try:
            item_data = generate_items_from_concepts(concepts)
            if item_data:
                save_items_linked(item_data)
                print(f"  > Items generated & saved for {len(item_data.get('items',[]))} questions.")
        except Exception as e:
             print(f"  ! Concept-Item pass failed: {e}")
        
        time.sleep(1)

# ---------- 4. Skill Generation ----------
SKILLS_SCHEMA = {
  "type": "object",
  "properties": {
    "skills": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "code": {"type": "string", "description": "e.g. FLU-01"},
          "name": {"type": "string"},
          "description": {"type": "string"},
          "prerequisites": {"type": "array", "items": {"type": "string"}, "description": "List of prerequisite skill CODES"}
        },
        "required": ["code", "name", "description", "prerequisites"],
        "additionalProperties": False
      }
    }
  },
  "required": ["skills"],
  "additionalProperties": False
}

def generate_skills_for_domain(domain_slug: str):
    # 1. Fetch all concepts for context
    # We'll use a simple query or RPC. For now lets fetch via rpc
    # But get_all_concepts_rpc returns EVERY concept. We need filter by domain.
    # Let's just fetch a reasonable amount of concepts text to give context.
    
    # Check if domain exists
    did = ensure_domain(domain_slug)
    
    # Fetch concepts text (hacky way via direct query or just use the generated items to infer?)
    # actually better to use the 'get_concepts_for_gen' but filtered?
    # No, let's just use existing concepts.
    # LIMITATION: We don't have a specific 'get_concepts_by_domain' in python helper yet.
    # Let's create a temporary one using `sb.table`.
    
    resp = sb.schema("learning").table("concepts").select("name, definition").eq("domain_id", did).limit(50).execute()
    concepts = resp.data
    
    if not concepts:
         print(f"No concepts found for {domain_slug}")
         return

    concepts_text = "\n".join([f"- {c['name']}: {c['definition']}" for c in concepts])
    
    prompt = (
        f"Actúa como un arquitecto de currículo educativo para el dominio: {domain_slug}.\n"
        "Genera una lista de SKILLS (Habilidades Prácticas) basadas en los siguientes conceptos teóricos.\n"
        "REGLAS:\n"
        "1) Un Skill es una habilidad demostrable (ej: 'Calcular Takt', 'Identificar Desperdicios').\n"
        "2) NO uses temas genéricos ('Lean Básico').\n"
        "3) Define prerrequisitos usando los CÓDIGOS de otros skills generados.\n"
        "4) Genera entre 5 y 10 skills ordenados por dificultad.\n"
        f"CONCEPTOS DISPONIBLES:\n{concepts_text[:15000]}"
    )

    try:
        resp = ai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": "Curriculum designer."}, {"role": "user", "content": prompt}],
            response_format={"type": "json_schema", "json_schema": {"name": "gen_skills", "schema": SKILLS_SCHEMA, "strict": True}}
        )
        data = json.loads(resp.choices[0].message.content)
        return data.get("skills", [])
    except Exception as e:
        print(f"Skill Gen Error: {e}")
        return []

def save_skills_tree(domain_slug: str, skills_data: list):
    did = ensure_domain(domain_slug)
    code_to_id = {}
    
    # 1. Upsert Skills
    for s in skills_data:
        try:
            res = sb.rpc("upsert_skill_rpc", {
                "_domain_id": did,
                "_code": s["code"],
                "_name": s["name"],
                "_description": s["description"]
            }).execute()
            # Assuming RPC returns ID? Actually upsert_skill_rpc typically returns void or ID.
            # Let's check RPC definition? It returns void in my memory? 
            # Wait, I created 'upsert_skill_rpc' in step 18. Let's assume it returns ID or I query it.
            # Workaround: Query ID by code.
            
            s_obj = sb.schema("learning").table("skills").select("id").eq("domain_id", did).eq("code", s["code"]).single().execute()
            if s_obj.data:
                code_to_id[s["code"]] = s_obj.data["id"]
                print(f"  > Skill saved: {s['name']} ({s['code']})")
        except Exception as e:
            print(f"  ! Err saving skill {s['code']}: {e}")

    # 2. Link Prerequisites
    for s in skills_data:
        sid = code_to_id.get(s["code"])
        if not sid: continue
        
        for pre_code in s.get("prerequisites", []):
            pid = code_to_id.get(pre_code)
            if pid:
                try:
                    sb.schema("learning").table("skill_prerequisites").insert({"skill_id": sid, "prereq_skill_id": pid}).execute()
                    print(f"    > Linked {s['code']} requires {pre_code}")
                except:
                    pass # Ignore unique violations

def run_skill_generation(target_domain=None):
    if target_domain:
        input_str = target_domain.strip().lower()
    else:
        input_str = input("Enter domain slug (e.g. flujo, calidad) OR 'all' for every domain: ").strip().lower()
    
    domains_to_process = []
    if input_str == 'all':
        # Fetch all domains from DB
        try:
            resp = sb.schema("learning").table("domains").select("slug").execute()
            domains_to_process = [d["slug"] for d in resp.data]
            print(f"Found {len(domains_to_process)} domains to process.")
        except Exception as e:
            print(f"Error fetching domains: {e}")
            return
    else:
        domains_to_process = [input_str]

    for domain in domains_to_process:
        print(f"\n--- Generating skills for domain: {domain} ---")
        skills = generate_skills_for_domain(domain)
        if skills:
            save_skills_tree(domain, skills)
        else:
            print(f"Skipping {domain} (no skills generated or no concepts found).")
        
    print("\nSkill tree generation process complete.")

# ---------- 5. Item Generation from SKILLS ----------
def get_skills_for_gen(domain_slug: str):
    # Use RPC to get only skills that need items (< 3 items)
    try:
        resp = sb.rpc("get_skills_needing_items_rpc", {"_domain_slug": domain_slug}).execute()
        return resp.data or []
    except Exception as e:
        print(f"Error fetching skills for gen: {e}")
        return []

def generate_items_from_skills(domain_slug: str):
    skills = get_skills_for_gen(domain_slug)
    if not skills:
        print(f"No skills found for {domain_slug}. Run Mode 3 first.")
        return

    print(f"Found {len(skills)} skills. Generating items...")
    
    for skill in skills:
        print(f"Processing Skill: {skill['name']} ({skill['code']})...")
        
        # We can also fetch some concepts to give context?
        # For now, let's rely on the skill description description + domain.
        
        prompt = (
            f"Genera preguntas de evaluación (Items) para el SKILL: '{skill['name']}'\n"
            f"Descripción: {skill['description']}\n"
            f"Dominio: {domain_slug}\n"
            "CONTEXTO: El usuario debe demostrar que domina esta habilidad práctica.\n"
            "REGLAS:\n"
            "1) Genera 3 preguntas (1 Multiple Choice, 1 Case Study corto, 1 Scenario).\n"
            "2) IMPORTANTE: TODOS los items (incluyendo Case/Scenario) DEBEN tener 'options' (multiple choice).\n"
            "3) Deben probar 'Aplicar' o 'Analizar' (niveles cognitivos altos).\n"
            "4) correct_answer debe ser el texto EXACTO de una de las opciones.\n"
            "5) Usa el esquema JSON estándar.\n"
        )
        
        # Reuse ITEMS_SCHEMA but we will manually inject skill_id later
        try:
            resp = ai.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": "Assessment generator."}, {"role": "user", "content": prompt}],
                response_format={"type": "json_schema", "json_schema": {"name": "gen_items_skill", "schema": ITEMS_SCHEMA, "strict": True}}
            )
            data = json.loads(resp.choices[0].message.content)
            
            # Save items linked to skill
            # Save items linked to skill
            items = data.get("items", [])
            saved_count = 0
            for item in items:
                if item["confidence"] < 0.7: continue
                try:
                    did = ensure_domain(domain_slug) 
                    sb.rpc("upsert_item_rpc", {
                        "_skill_id": skill["skill_id"], 
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
                    print(f"  ! Err saving item: {e}")
            
            print(f"  > Saved {saved_count} items for skill {skill['code']}.")
            time.sleep(1) # Rate limit
            
        except Exception as e:
            print(f"  ! Error generating items for skill {skill['code']}: {e}")

def run_items_from_skills(target_domain=None):
    if target_domain:
        input_str = target_domain.strip().lower()
    else:
       input_str = input("Enter domain slug (e.g. flujo, calidad) OR 'all' for every domain: ").strip().lower()
    
    domains_to_process = []
    if input_str == 'all':
        try:
            resp = sb.schema("learning").table("domains").select("slug").execute()
            domains_to_process = [d["slug"] for d in resp.data]
            print(f"Found {len(domains_to_process)} domains to process.")
        except Exception as e:
            print(f"Error fetching domains: {e}")
            return
    else:
        domains_to_process = [input_str]

    for domain in domains_to_process:
        print(f"\n--- Generating items from skills for: {domain} ---")
        generate_items_from_skills(domain)

# ---------- 6. Domain Description Generation (Mode 5) ----------
DOMAIN_KEYWORDS = {
    "flujo": ["flujo", "flow", "continuo", "continuous", "one piece", "pieza a pieza", "lote unitario", "lead time"],
    "calidad": ["calidad", "quality", "defecto", "jidoka", "poka yoke", "cero defectos", "autonomatización"],
    "cambio-rapido": ["smed", "changeover", "cambio rápido", "single minute", "preparación", "setup"],
    "pull": ["pull", "kanban", "jalar", "supermercado", "fifo", "just in time", "justo a tiempo"],
    "estabilidad": ["5s", "estabilidad", "estándar", "standard", "visual", "orden", "limpieza"],
    "liderazgo": ["liderazgo", "leadership", "hoshin", "kata", "gemba", "respeto", "retar"],
    "mejora": ["mejora", "kaizen", "continuo", "pdca", "a3", "solución de problemas"],
    "just-in-time": ["just in time", "jit", "justo a tiempo", "pull", "flujo", "takt time"],
    "muda": ["muda", "desperdicio", "waste", "7 desperdicios", "valor agregado"],
    "mura": ["mura", "variabilidad", "irregularidad", "desnivel", "fluctuación"],
    "muri": ["muri", "sobrecarga", "estrés", "sobreesfuerzo", "ergonomía"],
    "gemba": ["gemba", "genchi genbutsu", "piso de producción", "lugar real", "observación directa"],
    "kaizen": ["kaizen", "mejora continua", "cambio bueno", "pdca", "pequeñas mejoras"],
    "hoshin": ["hoshin", "hoshin kanri", "despliegue de políticas", "estrategia", "norte verdadero"]
}

def generate_domain_description(domain_slug: str):
    print(f"Generating description for domain: {domain_slug}...")
    
    # 1. Check Keywords
    keywords = DOMAIN_KEYWORDS.get(domain_slug, [domain_slug.replace("-", " ")])
    
    # 2. Fetch Relevant Chunks
    # We construct a dynamic OR query for keywords
    or_query = ",".join([f"contenido.ilike.%{k}%" for k in keywords])
    
    try:
        # Fetch up to 15 chunks
        resp = sb.table("documentos_certificacion").select("contenido").or_(or_query).limit(15).execute()
        chunks = resp.data
    except Exception as e:
        print(f"  ! Error fetching chunks: {e}")
        return

    if not chunks:
        print(f"  ! No documents found matching keywords: {keywords}")
        return

    print(f"  > Found {len(chunks)} relevant documents/chunks.")
    combined_text = "\n---\n".join([c["contenido"][:1000] for c in chunks]) # Limit context window

    # 3. Generate Description via LLM
    prompt = (
        f"Actúa como un profesor experto en Lean Manufacturing.\n"
        f"Genera una descripción comprensiva, académica pero accesible para el Dominio: '{domain_slug.upper()}'.\n"
        "REGLAS:\n"
        "1) Usa EXCLUSIVAMENTE la información de los siguientes extractos de documentos certificados.\n"
        "2) La descripción debe tener 2-3 párrafos.\n"
        "3) Debe explicar QUÉ ES, POR QUÉ es importante y CÓMO se relaciona con la excelencia operacional.\n"
        "4) No menciones 'según el texto'. Escribe como una definición definitiva.\n"
        f"EXTRACTOS:\n{combined_text[:25000]}"
    )
    
    try:
        resp = ai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": "Educational content generator."}, {"role": "user", "content": prompt}],
            temperature=0.3
        )
        description = resp.choices[0].message.content.strip()
        
        # 4. Update Database
        sb.schema("learning").table("domains").update({"description": description}).eq("slug", domain_slug).execute()
        print(f"  > Description updated successfully for '{domain_slug}'.")
        print(f"  > Preview: {description[:100]}...")
        
    except Exception as e:
        print(f"  ! Error generating/saving description: {e}")

def run_domain_descriptions(target_domain=None):
    if target_domain:
         input_str = target_domain.strip().lower()
    else:
        input_str = input("Enter domain slug (e.g. flujo) OR 'all': ").strip().lower()

    slugs = []
    if input_str == 'all':
        slugs = list(DOMAIN_KEYWORDS.keys())
    else:
        slugs = [input_str]
        
    for slug in slugs:
        generate_domain_description(slug)


import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nexia Edu Pipeline")
    parser.add_argument("--mode", type=str, help="Pipeline mode (1-4)")
    parser.add_argument("--target", type=str, help="Domain slug or 'all'", default="")
    
    args = parser.parse_args()
    
    if args.mode:
        # Non-interactive mode
        if args.mode == "1":
            run_pipeline()
        elif args.mode == "2":
            run_concepts_pipeline()
        elif args.mode == "3":
            if args.target:
                run_skill_generation(target_domain=args.target)
            else:
                print("Mode 3 requires --target (domain or 'all')")
                exit(1)
        elif args.mode == "4":
            if args.target:
                run_items_from_skills(target_domain=args.target)
        elif args.mode == "4":
            if args.target:
                run_items_from_skills(target_domain=args.target)
            else:
                print("Mode 4 requires --target")
                exit(1)
        elif args.mode == "5":
             run_domain_descriptions(target_domain=args.target)

    else:
        # Interactive mode
        mode = input("Select Mode:\n(1) Process Chunks\n(2) Generate Items from Concepts\n(3) Generate Skill Tree\n(4) Generate Items from SKILLS\n(5) Populate Domain Descriptions\n> ")
        if mode == "1":
            run_pipeline()
        elif mode == "2":
            run_concepts_pipeline()
        elif mode == "3":
            run_skill_generation()
        elif mode == "4":
            run_items_from_skills()
        elif mode == "5":
            run_domain_descriptions()
        else:
            print("Invalid mode")
