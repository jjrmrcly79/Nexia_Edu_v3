-- 04_vector_search.sql
-- Habilitar pgvector, añadir la columna a la tabla existente y crear la función de similitud.

-- 1. Habilitar la extensión de vectores matemáticos
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- 2. Añadir la columna "embedding" a la tabla de documentos
-- El modelo "text-embedding-3-small" de OpenAI devuelve vectores de longitud 1536
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' 
        AND table_name='documentos_certificacion' 
        AND column_name='embedding'
    ) THEN
        ALTER TABLE public.documentos_certificacion ADD COLUMN embedding vector(1536);
    END IF;
END $$;

-- 3. Crear el índice para búsqueda rápida
-- HNSW (Hierarchical Navigable Small World) es muy eficiente y recomendado para datos de OpenAI.
-- Creamos el índice asumiendo el operador de similitud de coseno (<=>)
CREATE INDEX IF NOT EXISTS documentos_embedding_idx ON public.documentos_certificacion 
USING hnsw (embedding vector_cosine_ops);

-- 4. Crear la función RPC para que el Cliente (Next.js) o el Servidor busque
CREATE OR REPLACE FUNCTION public.match_documents_rpc(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  contenido text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  -- Operador <=> calcula "Cosine Distance". Similitud de coseno = 1 - Cosine Distance.
  SELECT
    id,
    contenido,
    metadata,
    1 - (documentos_certificacion.embedding <=> query_embedding) AS similarity
  FROM public.documentos_certificacion
  WHERE 1 - (documentos_certificacion.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
