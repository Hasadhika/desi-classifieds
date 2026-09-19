/*
  # Fix listing SELECT RLS to allow owners to view their own listings regardless of status

  1. Problem
    - The current SELECT policy only returns listings with status = 'active'
    - When a user marks their listing as 'sold', querying it returns null (blocked by RLS)
    - This breaks the Switch to Sold flow and the listing detail page for the owner

  2. Changes
    - Drop the restrictive "Allow public read active listings" policy
    - Add a new policy that allows:
      - Anyone to read active listings (public)
      - Authenticated users to read their own listings (any status)
*/

DROP POLICY IF EXISTS "Allow public read active listings" ON listings;
DROP POLICY IF EXISTS "Anyone can read active listings" ON listings;

CREATE POLICY "Public can read active listings"
  ON listings FOR SELECT
  USING (status = 'active');

CREATE POLICY "Owners can read own listings any status"
  ON listings FOR SELECT
  TO authenticated
  USING (poster_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
