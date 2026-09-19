/*
  # Allow authenticated users to read any profile

  1. Changes
    - Adds a SELECT policy so authenticated users can view other users' profiles
    - This is needed for the public UserProfile page to show seller info
*/

CREATE POLICY "Authenticated users can read any profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);
