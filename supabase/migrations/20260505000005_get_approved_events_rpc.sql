-- Public RPC to fetch approved events — avoids table-level GRANT issues
-- SECURITY DEFINER runs as postgres, bypassing RLS and anon role restrictions
CREATE OR REPLACE FUNCTION public.get_approved_events()
RETURNS SETOF public.events
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.events
  WHERE status = 'approved'
  ORDER BY event_date ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_approved_events() TO anon;
GRANT EXECUTE ON FUNCTION public.get_approved_events() TO authenticated;
