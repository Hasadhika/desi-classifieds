-- Grant table-level SELECT to anon and authenticated roles
-- RLS policies control row visibility, but the role must have table access first
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.events TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
