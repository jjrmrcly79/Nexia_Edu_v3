-- Create or replace the function to get user domain progress
CREATE OR REPLACE FUNCTION public.get_user_domain_progress_rpc(
    _user_id TEXT
)
RETURNS TABLE (
    domain_id UUID,
    domain_slug TEXT,
    domain_name TEXT,
    domain_description TEXT,
    correct_answers BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id AS domain_id,
        d.slug AS domain_slug,
        d.name AS domain_name,
        d.description AS domain_description,
        COUNT(up.id) AS correct_answers
    FROM 
        learning.domains d
    LEFT JOIN 
        learning.items i ON d.id = i.domain_id
    LEFT JOIN 
        public.user_progress up ON i.id = up.item_id AND up.user_id = _user_id AND up.is_correct = true
    GROUP BY 
        d.id, d.slug, d.name, d.description, d.created_at
    ORDER BY 
        d.created_at ASC;
END;
$$;
