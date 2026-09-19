-- SECURITY DEFINER RPC for admin to fetch all events bypassing RLS
CREATE OR REPLACE FUNCTION public.admin_get_all_events()
RETURNS SETOF public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY SELECT * FROM public.events ORDER BY created_at DESC;
END;
$$;
