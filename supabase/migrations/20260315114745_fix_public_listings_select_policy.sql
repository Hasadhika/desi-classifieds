/*
  # Fix public listings SELECT policy

  The previous migration's "Public can read active listings" policy was missing
  the TO clause, so it only applied to authenticated users by default.
  This caused all listings to disappear for unauthenticated visitors and broke
  the home page listing sections.

  Fix: Drop and recreate the policy explicitly targeting both anon and authenticated roles.
*/

DROP POLICY IF EXISTS "Public can read active listings" ON listings;

CREATE POLICY "Public can read active listings"
  ON listings FOR SELECT
  TO anon, authenticated
  USING (status = 'active');
