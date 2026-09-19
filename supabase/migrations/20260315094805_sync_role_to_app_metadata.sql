/*
  # Sync profile role to auth.users app_metadata

  1. Updates app_metadata for all existing users with their profile role
  2. Creates a trigger to auto-sync role to app_metadata whenever profiles.role changes
  
  This ensures the role is available directly in the JWT token without needing
  a separate database query after authentication.
*/

CREATE OR REPLACE FUNCTION sync_profile_role_to_app_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_change ON profiles;

CREATE TRIGGER on_profile_role_change
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_role_to_app_metadata();

UPDATE auth.users u
SET raw_app_meta_data = 
  COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
FROM profiles p
WHERE u.id = p.id;
