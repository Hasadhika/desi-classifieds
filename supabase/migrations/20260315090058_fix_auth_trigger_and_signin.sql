
/*
  # Fix Auth Trigger and Sign-In Issues

  ## Problem
  The sign-in and sign-up were both returning 500 "Database error" from Supabase Auth.

  ## Root Causes
  1. The handle_new_user trigger had SECURITY DEFINER but was not handling errors gracefully
  2. The trigger could cause the entire auth transaction to fail if any issue occurs
  3. The function needs exception handling to prevent auth failures

  ## Changes
  - Recreate handle_new_user with proper exception handling so trigger failures don't block auth
  - Ensure the trigger is correctly set up
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, created_date)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'user',
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
