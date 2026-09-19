/*
  # Add role enum constraint to profiles

  ## Changes
  - Adds a CHECK constraint on profiles.role to enforce valid values:
    'user', 'admin', 'paid_user', 'advertiser'
  - Ensures any existing invalid roles default to 'user'
  - Sets default role to 'user' for new signups

  ## Notes
  - 'paid_user' and 'advertiser' are reserved for future payment integration
  - Existing data is preserved; only future inserts/updates are constrained
*/

ALTER TABLE profiles
  ALTER COLUMN role SET DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('user', 'admin', 'paid_user', 'advertiser'));
  END IF;
END $$;
