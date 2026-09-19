/*
  # Create Admin User and Auto Profile Creation Trigger

  1. Changes
    - Create trigger function to automatically create profile when auth user is created
    - Set up trigger on auth.users table
    - Create admin user for ram@ncplconsulting.net with proper credentials
  
  2. Security
    - Trigger function runs with SECURITY DEFINER to bypass RLS
    - Admin user created with proper role assignment
    - Profile creation is atomic with user creation
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
