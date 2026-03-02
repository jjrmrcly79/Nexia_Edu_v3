-- 01_schema.sql
CREATE SCHEMA IF NOT EXISTS learning;

-- DOMAINS
CREATE TABLE IF NOT EXISTS learning.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CONCEPTS
CREATE TABLE IF NOT EXISTS learning.concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES learning.domains(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    definition TEXT,
    aliases TEXT[],
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SKILLS
CREATE TABLE IF NOT EXISTS learning.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES learning.domains(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ITEMS (Questions)
CREATE TABLE IF NOT EXISTS learning.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES learning.domains(id) ON DELETE CASCADE,
    concept_id UUID REFERENCES learning.concepts(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES learning.skills(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    item_type TEXT NOT NULL,
    options JSONB,
    correct_answer JSONB,
    explanation TEXT,
    knowledge_type TEXT,
    cognitive_level TEXT,
    difficulty INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- USER PROGRESS
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- UUID or simple string if no Auth
    item_id UUID REFERENCES learning.items(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- USER STREAKS
CREATE TABLE IF NOT EXISTS public.user_streaks (
    user_id TEXT PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    last_practice_date DATE,
    total_points INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RPC: get_practice_items_rpc
CREATE OR REPLACE FUNCTION public.get_practice_items_rpc(
    _domain_slug TEXT DEFAULT NULL,
    _domain_id UUID DEFAULT NULL,
    _context_type TEXT DEFAULT NULL,
    _context_id UUID DEFAULT NULL,
    _limit INTEGER DEFAULT 5
)
RETURNS SETOF learning.items 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT i.*
    FROM learning.items i
    LEFT JOIN learning.domains d ON i.domain_id = d.id
    WHERE 
        (_domain_slug IS NULL OR d.slug = _domain_slug) AND
        (_domain_id IS NULL OR i.domain_id = _domain_id) AND
        (_context_id IS NULL OR 
            CASE 
                WHEN _context_type = 'concept' THEN i.concept_id = _context_id 
                WHEN _context_type = 'skill' THEN i.skill_id = _context_id 
                ELSE FALSE 
            END
        )
    ORDER BY random()
    LIMIT _limit;
END;
$$;

-- RPC: get_term_details_rpc
CREATE OR REPLACE FUNCTION public.get_term_details_rpc(
    _id UUID,
    _type TEXT
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    definition TEXT,
    domain_name TEXT,
    evidence JSONB,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF _type = 'concept' THEN
        RETURN QUERY
        SELECT c.id, c.name, c.definition, d.name AS domain_name, '[]'::jsonb, '{}'::jsonb
        FROM learning.concepts c
        LEFT JOIN learning.domains d ON c.domain_id = d.id
        WHERE c.id = _id;
    ELSIF _type = 'skill' THEN
        RETURN QUERY
        SELECT s.id, s.name, s.description AS definition, d.name AS domain_name, '[]'::jsonb, '{}'::jsonb
        FROM learning.skills s
        LEFT JOIN learning.domains d ON s.domain_id = d.id
        WHERE s.id = _id;
    END IF;
END;
$$;

-- RPC: save_practice_progress_rpc
CREATE OR REPLACE FUNCTION public.save_practice_progress_rpc(
    _user_id TEXT,
    _item_id UUID,
    _is_correct BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _today DATE := current_date;
    _last_date DATE;
    _points_to_add INTEGER := 0;
BEGIN
    -- Insert progress record
    INSERT INTO public.user_progress (user_id, item_id, is_correct)
    VALUES (_user_id, _item_id, _is_correct);

    IF _is_correct THEN
        _points_to_add := 10;
    END IF;

    -- Handle streak and points
    SELECT last_practice_date INTO _last_date
    FROM public.user_streaks
    WHERE user_id = _user_id;

    IF NOT FOUND THEN
        -- Initial insert
        INSERT INTO public.user_streaks (user_id, current_streak, last_practice_date, total_points)
        VALUES (_user_id, 1, _today, _points_to_add);
    ELSE
        IF _last_date = _today - interval '1 day' THEN
            -- Streak continues
            UPDATE public.user_streaks
            SET current_streak = current_streak + 1,
                last_practice_date = _today,
                total_points = total_points + _points_to_add,
                updated_at = now()
            WHERE user_id = _user_id;
        ELSIF _last_date < _today - interval '1 day' THEN
            -- Streak broken
            UPDATE public.user_streaks
            SET current_streak = 1,
                last_practice_date = _today,
                total_points = total_points + _points_to_add,
                updated_at = now()
            WHERE user_id = _user_id;
        ELSE
            -- Already practiced today
            UPDATE public.user_streaks
            SET total_points = total_points + _points_to_add,
                updated_at = now()
            WHERE user_id = _user_id;
        END IF;
    END IF;
END;
$$;

-- MOCK DATA to test UI immediately
INSERT INTO learning.domains (slug, name, description) VALUES
('flujo', 'Flujo Continuo (Flow)', 'Dominio sobre flujo y lean')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
    _domain_id UUID;
    _concept_id UUID;
BEGIN
    SELECT id INTO _domain_id FROM learning.domains WHERE slug = 'flujo';

    IF _domain_id IS NOT NULL THEN
        INSERT INTO learning.concepts (domain_id, name, definition) 
        VALUES (_domain_id, 'Takt Time', 'Ritmo de producción necesario para satisfacer la demanda del cliente.')
        RETURNING id INTO _concept_id;

        INSERT INTO learning.items (domain_id, concept_id, prompt, item_type, options, correct_answer, explanation)
        VALUES (
            _domain_id, 
            _concept_id, 
            '¿Qué es Takt Time?', 
            'mcq', 
            '{"A": "Tiempo de entrega", "B": "Ritmo del cliente", "C": "Tiempo muerto"}', 
            '"B"', 
            'Takt Time representa el ritmo al que el cliente compra el producto.'
        );
        INSERT INTO learning.items (domain_id, concept_id, prompt, item_type, options, correct_answer, explanation)
        VALUES (
            _domain_id, 
            _concept_id, 
            '¿Para qué sirve el concepto de Flujo continuo?', 
            'mcq', 
            '{"A": "Aumentar WIP", "B": "Reducir tiempo de ciclo y delatar problemas", "C": "Producir en grandes lotes"}', 
            '"B"', 
            'El flujo unitario reduce WIP y expone problemas.'
        );
    END IF;
END $$;
