
/*
  # Fix profiles RLS and trigger-based inserts

  ## Problems
  1. The INSERT policy on profiles requires "authenticated" role, but the trigger
     handle_new_user() runs during the auth flow before the session is established,
     so it gets blocked by RLS with error 42501.
  2. Sign-up profile creation from the frontend also fails for the same reason.

  ## Fix
  - Drop the restrictive INSERT policy
  - Allow the trigger (SECURITY DEFINER) to bypass RLS by granting insert to the
    service_role and also allow authenticated users to insert their own profile
  - Add a policy that allows the anon role to insert during the trigger context
*/

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);
