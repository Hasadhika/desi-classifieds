-- ============================================================
-- Run this in your Supabase SQL Editor (one-time setup)
-- Dashboard → SQL Editor → paste this → Run
-- ============================================================

-- 1. Add new columns to advertisements table
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS advertiser_name    text;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS advertiser_email   text;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS description        text;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS video_url          text;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS images             text[]  DEFAULT '{}';
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS media_type         text    NOT NULL DEFAULT 'image';
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS amount_paid        numeric(10,2);
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS payment_status     text    NOT NULL DEFAULT 'unpaid';
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS transaction_id     text;

-- 2. Allow authenticated users to submit ads (self-serve advertisers)
--    Drop the old admin-only INSERT policy first — it queries profiles causing infinite recursion.
DROP POLICY IF EXISTS "Admins can insert advertisements" ON advertisements;
DROP POLICY IF EXISTS "Authenticated users can submit advertisements" ON advertisements;
CREATE POLICY "Authenticated users can submit advertisements"
  ON advertisements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Fix admin SELECT/UPDATE/DELETE policies — replace profiles-based checks
--    with auth.jwt() to avoid infinite recursion on the profiles table.
DROP POLICY IF EXISTS "Admins can select advertisements"      ON advertisements;
DROP POLICY IF EXISTS "Admins can update advertisements"      ON advertisements;
DROP POLICY IF EXISTS "Admins can delete advertisements"      ON advertisements;
DROP POLICY IF EXISTS "Public can view active advertisements" ON advertisements;
DROP POLICY IF EXISTS "Anyone can view active advertisements" ON advertisements;

-- Admins can see ALL ads (any status)
CREATE POLICY "Admins can select advertisements"
  ON advertisements FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Everyone (anon + authenticated non-admin) can see active ads
-- Note: no TO clause = applies to all roles, including authenticated non-admins
CREATE POLICY "Anyone can view active advertisements"
  ON advertisements FOR SELECT
  USING (status = 'active');

-- Admin update/delete using jwt instead of profiles lookup
CREATE POLICY "Admins can update advertisements"
  ON advertisements FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete advertisements"
  ON advertisements FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 4. Allow users to view their own advertisement submissions (all statuses)
DROP POLICY IF EXISTS "Users can view own advertisements" ON advertisements;
CREATE POLICY "Users can view own advertisements"
  ON advertisements FOR SELECT
  TO authenticated
  USING (created_by = auth.jwt() ->> 'email');

-- 5. (Optional) RPC helpers for impression/click tracking
CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE advertisements SET impressions = COALESCE(impressions, 0) + 1 WHERE id = ad_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE advertisements SET clicks = COALESCE(clicks, 0) + 1 WHERE id = ad_id;
END;
$$;
