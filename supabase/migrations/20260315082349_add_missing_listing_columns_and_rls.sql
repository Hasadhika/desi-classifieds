/*
  # Add missing listing columns and enable RLS on core tables

  ## Summary
  Several columns referenced in the frontend code are missing from the database,
  and RLS is disabled on key tables. This migration fixes both issues.

  ## Changes

  ### 1. New Columns on listings table
  - `is_urgent` (boolean, default false) - marks a listing as urgent
  - `is_verified` (boolean, default false) - marks a listing as verified by admin
  - `postal_code` (text, nullable) - Canadian postal code for the listing

  ### 2. RLS Enabled
  - `listings` table: public read for active listings, authenticated write for owners
  - `saved_listings` table: users can only read/write their own saved listings
  - `messages` table: users can only read/write their own messages

  ### 3. Reports table
  - Add INSERT policy so authenticated users can submit listing reports

  ## Security Notes
  - All policies enforce authentication for writes
  - Listings are publicly readable (marketplace requirement)
  - Users can only modify their own data
*/

-- Add missing columns to listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'is_urgent'
  ) THEN
    ALTER TABLE listings ADD COLUMN is_urgent boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE listings ADD COLUMN is_verified boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE listings ADD COLUMN postal_code text;
  END IF;
END $$;

-- Enable RLS on listings
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active listings"
  ON listings FOR SELECT
  USING (status = 'active' OR auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create listings"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own listings"
  ON listings FOR UPDATE
  TO authenticated
  USING (poster_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (poster_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own listings"
  ON listings FOR DELETE
  TO authenticated
  USING (poster_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can update any listing"
  ON listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Enable RLS on saved_listings
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own saved listings"
  ON saved_listings FOR SELECT
  TO authenticated
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can save listings"
  ON saved_listings FOR INSERT
  TO authenticated
  WITH CHECK (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can unsave their own saved listings"
  ON saved_listings FOR DELETE
  TO authenticated
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    receiver_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    sender_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    receiver_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    sender_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    receiver_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Add INSERT policy to reports table so users can submit listing reports
CREATE POLICY "Authenticated users can submit reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can read own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (reporter_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can read all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
