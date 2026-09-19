/*
  # Platform Settings and Promoted Listings

  1. New Tables
    - `platform_settings`
      - Key-value store for admin-configurable settings
      - Stores: free_ads_limit (default 3), promotion_price, etc.
    - `promoted_listings`
      - Tracks listings promoted to the homepage
      - Columns: listing_id, user_email, amount_paid, status, starts_at, ends_at

  2. Security
    - RLS enabled on both tables
    - Only admins can write platform_settings
    - Authenticated users can read platform_settings
    - Users can insert/read their own promoted_listings
    - Admins can read/update all promoted_listings
*/

CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert settings"
  ON platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update settings"
  ON platform_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

INSERT INTO platform_settings (key, value, description) VALUES
  ('free_ads_limit', '3', 'Number of free ads a user can post before payment is required'),
  ('post_ad_price', '4.99', 'Price in CAD to post additional ads beyond the free limit'),
  ('promotion_price', '9.99', 'Price in CAD to promote a listing on the homepage'),
  ('promotion_duration_days', '7', 'Number of days a promoted listing stays on the homepage')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS promoted_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  amount_paid numeric(10,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  transaction_id text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promoted_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own promoted listings"
  ON promoted_listings FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT id FROM profiles WHERE email = user_email LIMIT 1));

CREATE POLICY "Admins can view all promoted listings"
  ON promoted_listings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own promoted listings"
  ON promoted_listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT id FROM profiles WHERE email = user_email LIMIT 1));

CREATE POLICY "Admins can update promoted listings"
  ON promoted_listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
