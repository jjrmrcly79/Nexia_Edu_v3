-- 03_gamification_schema.sql

-- TABLE: user_concept_badges
-- Stores the mastery level of a user for specific concepts
CREATE TABLE IF NOT EXISTS public.user_concept_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    concept_id UUID NOT NULL REFERENCES learning.concepts(id) ON DELETE CASCADE,
    mastery_level TEXT NOT NULL CHECK (mastery_level IN ('bronze', 'silver', 'gold')),
    matches_won INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, concept_id)
);

-- ADD RANK TO USER STREAKS (Profile)
-- Adding columns to track global rank title and numerical level
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_streaks' AND column_name='rank_title') THEN
        ALTER TABLE public.user_streaks ADD COLUMN rank_title TEXT DEFAULT 'Iniciado Lean';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_streaks' AND column_name='rank_level') THEN
        ALTER TABLE public.user_streaks ADD COLUMN rank_level INTEGER DEFAULT 1;
    END IF;
END $$;


-- RPC: get_memory_game_concepts_rpc
-- Fetches a specific number of random concepts for a given domain
CREATE OR REPLACE FUNCTION public.get_memory_game_concepts_rpc(
    _domain_id UUID,
    _limit INTEGER DEFAULT 6
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    definition TEXT,
    domain_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH target_domain AS (
        SELECT c.id, c.name, c.definition, c.domain_id
        FROM learning.concepts c
        WHERE c.domain_id = _domain_id
        ORDER BY random()
        LIMIT _limit
    ),
    other_domains AS (
        SELECT c.id, c.name, c.definition, c.domain_id
        FROM learning.concepts c
        WHERE c.domain_id != _domain_id OR _domain_id IS NULL
        ORDER BY random()
        LIMIT GREATEST(0, _limit - (SELECT count(*) FROM target_domain))
    )
    SELECT * FROM target_domain
    UNION ALL
    SELECT * FROM other_domains;
END;
$$;


-- RPC: calculate_rank_rpc
-- Helper function to determine rank based on total points.
-- Level increments infinitely (e.g., +1 level per 200 XP).
-- Tier titles change at specific wide point thresholds.
CREATE OR REPLACE FUNCTION public.calculate_rank_rpc(
    _total_points INTEGER
)
RETURNS TABLE (
    new_rank_title TEXT,
    new_rank_level INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    _calculated_level INTEGER;
    _calculated_title TEXT;
BEGIN
    -- Numerial Level: Base level 1 + 1 level per 200 XP
    _calculated_level := 1 + FLOOR(_total_points / 200);

    -- Rank Title: Scales up to be a real challenge
    IF _total_points < 1000 THEN
        _calculated_title := 'Iniciado Lean';
    ELSIF _total_points < 3000 THEN
        _calculated_title := 'Asesor Bronce';
    ELSIF _total_points < 6000 THEN
        _calculated_title := 'Asesor Plata';
    ELSIF _total_points < 10000 THEN
        _calculated_title := 'Asesor Oro';
    ELSE
        _calculated_title := 'Maestro Jedi Lean';
    END IF;

    RETURN QUERY SELECT _calculated_title, _calculated_level;
END;
$$;


-- RPC: save_game_result_rpc
-- Called when a memory game finishes. Awards XP and potentially upgrades badges and ranks.
CREATE OR REPLACE FUNCTION public.save_game_result_rpc(
    _user_id TEXT,
    _concept_ids UUID[],
    _points_earned INTEGER
)
RETURNS TABLE (
    badges_upgraded INTEGER,
    new_total_points INTEGER,
    new_rank_title TEXT,
    new_rank_level INTEGER,
    rank_upgraded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _concept_id UUID;
    _current_mastery TEXT;
    _matches INTEGER;
    _badges_upgraded_count INTEGER := 0;
    
    _old_rank_level INTEGER;
    _current_points INTEGER;
    
    _calc_rank_title TEXT;
    _calc_rank_level INTEGER;
    _is_rank_upgraded BOOLEAN := FALSE;
BEGIN
    -- 1. Update Badges for each concept played
    FOREACH _concept_id IN ARRAY _concept_ids
    LOOP
        -- Check if badge exists
        SELECT mastery_level, matches_won INTO _current_mastery, _matches 
        FROM public.user_concept_badges
        WHERE user_id = _user_id AND concept_id = _concept_id;

        IF NOT FOUND THEN
            -- First time winning this concept -> Bronze
            INSERT INTO public.user_concept_badges (user_id, concept_id, mastery_level, matches_won)
            VALUES (_user_id, _concept_id, 'bronze', 1);
            _badges_upgraded_count := _badges_upgraded_count + 1;
        ELSE
            -- Increment matches won
            _matches := _matches + 1;
            
            -- Mastery progression logic
            IF _current_mastery = 'bronze' AND _matches >= 5 THEN
                UPDATE public.user_concept_badges 
                SET mastery_level = 'silver', matches_won = _matches, updated_at = now() 
                WHERE user_id = _user_id AND concept_id = _concept_id;
                _badges_upgraded_count := _badges_upgraded_count + 1;
                
            ELSIF _current_mastery = 'silver' AND _matches >= 15 THEN
                UPDATE public.user_concept_badges 
                SET mastery_level = 'gold', matches_won = _matches, updated_at = now() 
                WHERE user_id = _user_id AND concept_id = _concept_id;
                _badges_upgraded_count := _badges_upgraded_count + 1;
                
            ELSE
                -- Just update matches count
                UPDATE public.user_concept_badges 
                SET matches_won = _matches, updated_at = now() 
                WHERE user_id = _user_id AND concept_id = _concept_id;
            END IF;
                
        END IF;
    END LOOP;

    -- 2. Update Global Points and Rank
    -- Get current state or initialize to defaults if user has no streak record yet
    SELECT total_points, rank_level INTO _current_points, _old_rank_level
    FROM public.user_streaks
    WHERE user_id = _user_id;

    IF NOT FOUND THEN
        -- Safely initialize local variables for new users
        _current_points := 0;
        _old_rank_level := 1;
        
        -- Insert initial profile record
        INSERT INTO public.user_streaks (user_id, current_streak, last_practice_date, total_points, rank_title, rank_level)
        VALUES (_user_id, 0, current_date, 0, 'Iniciado Lean', 1)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    -- Calculate new state
    _current_points := _current_points + _points_earned;
    
    -- Evaluate rank
    SELECT * INTO _calc_rank_title, _calc_rank_level FROM public.calculate_rank_rpc(_current_points);

    IF _calc_rank_level > _old_rank_level THEN
        _is_rank_upgraded := TRUE;
    END IF;

    -- Apply update
    UPDATE public.user_streaks
    SET total_points = _current_points,
        rank_title = _calc_rank_title,
        rank_level = _calc_rank_level,
        updated_at = now()
    WHERE user_id = _user_id;

    -- 3. Return results for UI to display level up animations
    RETURN QUERY SELECT 
        _badges_upgraded_count, 
        _current_points, 
        _calc_rank_title, 
        _calc_rank_level, 
        _is_rank_upgraded;
END;
$$;
