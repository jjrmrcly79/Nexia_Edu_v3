-- 05_admin_user_progress.sql
-- RPCs for the admin dashboard to view all users' learning progress.

-- RPC 1: get_all_users_progress_rpc
-- Returns a summary row for every user who has any activity.
CREATE OR REPLACE FUNCTION public.get_all_users_progress_rpc()
RETURNS TABLE (
    user_id TEXT,
    total_answers BIGINT,
    correct_answers BIGINT,
    accuracy_pct NUMERIC,
    total_points INTEGER,
    rank_title TEXT,
    rank_level INTEGER,
    current_streak INTEGER,
    badges_count BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.user_id,
        COALESCE(p.total_answers, 0::BIGINT)   AS total_answers,
        COALESCE(p.correct_answers, 0::BIGINT)  AS correct_answers,
        CASE WHEN COALESCE(p.total_answers, 0) > 0
             THEN ROUND(COALESCE(p.correct_answers, 0)::NUMERIC / p.total_answers * 100, 1)
             ELSE 0
        END                                      AS accuracy_pct,
        COALESCE(u.total_points, 0)              AS total_points,
        COALESCE(u.rank_title, 'Iniciado Lean')  AS rank_title,
        COALESCE(u.rank_level, 1)                AS rank_level,
        COALESCE(u.current_streak, 0)            AS current_streak,
        COALESCE(b.badges_count, 0::BIGINT)      AS badges_count,
        GREATEST(p.last_activity, u.updated_at)  AS last_activity
    FROM public.user_streaks u
    LEFT JOIN (
        SELECT
            up.user_id AS uid,
            COUNT(*)                             AS total_answers,
            COUNT(*) FILTER (WHERE up.is_correct) AS correct_answers,
            MAX(up.created_at)                   AS last_activity
        FROM public.user_progress up
        GROUP BY up.user_id
    ) p ON u.user_id = p.uid
    LEFT JOIN (
        SELECT
            ucb.user_id AS uid,
            COUNT(*) AS badges_count
        FROM public.user_concept_badges ucb
        GROUP BY ucb.user_id
    ) b ON u.user_id = b.uid
    ORDER BY last_activity DESC NULLS LAST;
END;
$$;


-- RPC 2: get_user_detail_progress_rpc
-- Returns three result sets combined via JSONB for a single user.
CREATE OR REPLACE FUNCTION public.get_user_detail_progress_rpc(
    _user_id TEXT
)
RETURNS TABLE (
    section TEXT,
    payload JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Section 1: profile
    RETURN QUERY
    SELECT 'profile'::TEXT, to_jsonb(row)
    FROM (
        SELECT
            s.user_id,
            s.total_points,
            s.rank_title,
            s.rank_level,
            s.current_streak,
            s.last_practice_date,
            (SELECT COUNT(*) FROM public.user_progress up2 WHERE up2.user_id = _user_id) AS total_answers,
            (SELECT COUNT(*) FROM public.user_progress up3 WHERE up3.user_id = _user_id AND up3.is_correct) AS correct_answers
        FROM public.user_streaks s
        WHERE s.user_id = _user_id
    ) row;

    -- Section 2: domain_progress (one row per domain)
    RETURN QUERY
    SELECT 'domain_progress'::TEXT, to_jsonb(row)
    FROM (
        SELECT
            d.name       AS domain_name,
            d.slug       AS domain_slug,
            COUNT(up.id) AS total_answers,
            COUNT(up.id) FILTER (WHERE up.is_correct) AS correct_answers,
            CASE WHEN COUNT(up.id) > 0
                 THEN ROUND(COUNT(up.id) FILTER (WHERE up.is_correct)::NUMERIC / COUNT(up.id) * 100, 1)
                 ELSE 0
            END AS accuracy_pct
        FROM learning.domains d
        LEFT JOIN learning.items i ON d.id = i.domain_id
        LEFT JOIN public.user_progress up ON i.id = up.item_id AND up.user_id = _user_id
        GROUP BY d.id, d.name, d.slug
        ORDER BY d.name
    ) row;

    -- Section 3: badges (one row per badge)
    RETURN QUERY
    SELECT 'badge'::TEXT, to_jsonb(row)
    FROM (
        SELECT
            c.name           AS concept_name,
            ucb.mastery_level,
            ucb.matches_won,
            ucb.updated_at
        FROM public.user_concept_badges ucb
        JOIN learning.concepts c ON ucb.concept_id = c.id
        WHERE ucb.user_id = _user_id
        ORDER BY ucb.updated_at DESC
    ) row;

    -- Section 4: recent_history (last 20 answers)
    RETURN QUERY
    SELECT 'history'::TEXT, to_jsonb(row)
    FROM (
        SELECT
            up.created_at,
            i.prompt       AS question,
            d.name         AS domain_name,
            up.is_correct
        FROM public.user_progress up
        JOIN learning.items i ON up.item_id = i.id
        LEFT JOIN learning.domains d ON i.domain_id = d.id
        WHERE up.user_id = _user_id
        ORDER BY up.created_at DESC
        LIMIT 20
    ) row;
END;
$$;
