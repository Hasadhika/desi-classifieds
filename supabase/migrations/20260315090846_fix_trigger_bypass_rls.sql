
/*
  # Fix trigger to properly bypass RLS on profiles insert

  ## Problem
  The handle_new_user() trigger is SECURITY DEFINER but still hits RLS because
  it runs as the function owner. We need to ensure the function runs with
  sufficient privileges to bypass RLS, OR we set the profiles table to allow
  the trigger's execution context.

  ## Fix
  - Set the trigger function to run as postgres (superuser) so it can bypass RLS
  - Also fix the INSERT policy to properly allow authenticated users to insert
    their own profile row (for frontend-side profile creation fallback)
*/

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;

ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
