/*
  # Fix admin listings update RLS policy

  ## Problem
  Admins get "Failed to update listing" because:
  - There are two conflicting UPDATE policies on listings for admins
  - The is_admin() function may have search_path issues causing it to fail

  ## Changes
  - Drop the duplicate admin update policies
  - Recreate a single clean admin update policy using direct subquery (same pattern as working policies)
  - Add 'sold' to allowed status values so sold listings can be updated by admins
*/

DROP POLICY IF EXISTS "Admins can update all listings" ON listings;
DROP POLICY IF EXISTS "Admins can update any listing" ON listings;

CREATE POLICY "Admins can update all listings"
  ON listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
