/*
  # Fix Admin RLS Infinite Recursion + Add Moderation Trigger

  ## Problems Fixed
  1. blocked_keywords, content_moderation_settings, platform_settings all used
     inline `EXISTS (SELECT 1 FROM profiles ...)` which causes infinite recursion
     when profiles table has its own RLS policies.
     Fix: replace with the existing is_admin() SECURITY DEFINER function.

  2. No actual duplicate detection, keyword blocking, or spam limiting was
     happening — only the UI settings were saved. Added a BEFORE INSERT trigger
     that enforces all three checks and sets status to 'flagged' when triggered.

  ## New
  - pg_trgm extension for fuzzy string similarity
  - check_listing_moderation() trigger function
  - listing_moderation_trigger on listings table
  - 'flagged' is a valid status (text column, no enum change needed)
*/

-- ─── 1. Fix RLS: blocked_keywords ───────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can select blocked keywords" ON blocked_keywords;
DROP POLICY IF EXISTS "Admins can insert blocked keywords" ON blocked_keywords;
DROP POLICY IF EXISTS "Admins can delete blocked keywords" ON blocked_keywords;

CREATE POLICY "Admins can select blocked keywords"
  ON blocked_keywords FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert blocked keywords"
  ON blocked_keywords FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete blocked keywords"
  ON blocked_keywords FOR DELETE TO authenticated
  USING (is_admin());

-- ─── 2. Fix RLS: content_moderation_settings ────────────────────────────────

DROP POLICY IF EXISTS "Admins can select content moderation settings" ON content_moderation_settings;
DROP POLICY IF EXISTS "Admins can update content moderation settings" ON content_moderation_settings;

CREATE POLICY "Admins can select content moderation settings"
  ON content_moderation_settings FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update content moderation settings"
  ON content_moderation_settings FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── 3. Fix RLS: platform_settings ──────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can insert settings" ON platform_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON platform_settings;

CREATE POLICY "Admins can insert settings"
  ON platform_settings FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update settings"
  ON platform_settings FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── 4. Enable pg_trgm for similarity matching ──────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── 5. Moderation trigger function ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_listing_moderation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_content       text;
  v_kw            text;
  v_spam_enabled  text;
  v_spam_limit    integer;
  v_spam_count    integer;
  v_dup_enabled   text;
  v_dup_threshold numeric;
BEGIN
  -- Only apply to non-admin posters posting in pending state
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Build searchable content string
  v_content := lower(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));

  -- ── A. Blocked keyword check ─────────────────────────────────────────────
  FOR v_kw IN SELECT keyword FROM blocked_keywords LOOP
    IF v_content LIKE '%' || lower(v_kw) || '%' THEN
      NEW.status := 'flagged';
      RETURN NEW;
    END IF;
  END LOOP;

  -- ── B. Spam posting limit ────────────────────────────────────────────────
  SELECT value INTO v_spam_enabled
    FROM content_moderation_settings WHERE key = 'spam_detection_enabled';

  IF v_spam_enabled = 'true' THEN
    SELECT value::integer INTO v_spam_limit
      FROM content_moderation_settings WHERE key = 'spam_posting_limit';
    v_spam_limit := COALESCE(v_spam_limit, 5);

    SELECT COUNT(*) INTO v_spam_count
      FROM listings
      WHERE poster_email = NEW.poster_email
        AND created_date >= (NOW() - INTERVAL '24 hours')
        AND id IS DISTINCT FROM NEW.id;

    IF v_spam_count >= v_spam_limit THEN
      NEW.status := 'flagged';
      RETURN NEW;
    END IF;
  END IF;

  -- ── C. Duplicate detection ───────────────────────────────────────────────
  SELECT value INTO v_dup_enabled
    FROM content_moderation_settings WHERE key = 'duplicate_detection_enabled';

  IF v_dup_enabled = 'true' THEN
    SELECT value::numeric INTO v_dup_threshold
      FROM content_moderation_settings WHERE key = 'duplicate_similarity_threshold';
    v_dup_threshold := COALESCE(v_dup_threshold, 80) / 100.0;

    IF EXISTS (
      SELECT 1 FROM listings
      WHERE id IS DISTINCT FROM NEW.id
        AND status NOT IN ('rejected', 'flagged', 'expired', 'sold')
        AND (
          similarity(title, NEW.title) >= v_dup_threshold
          OR similarity(description, NEW.description) >= v_dup_threshold
        )
    ) THEN
      NEW.status := 'flagged';
      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 6. Attach trigger to listings ──────────────────────────────────────────

DROP TRIGGER IF EXISTS listing_moderation_trigger ON listings;

CREATE TRIGGER listing_moderation_trigger
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION check_listing_moderation();

-- ─── 7. Allow update_listing_status RPC to handle 'flagged' status ──────────

CREATE OR REPLACE FUNCTION update_listing_status(
  p_listing_id uuid,
  p_new_status text
)
RETURNS listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email text;
  v_listing listings;
BEGIN
  IF p_new_status NOT IN ('active', 'sold', 'expired', 'pending', 'rejected', 'flagged') THEN
    RAISE EXCEPTION 'Invalid status value: %', p_new_status;
  END IF;

  SELECT email INTO v_caller_email
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_email IS NULL THEN
    v_caller_email := auth.email();
  END IF;

  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id;

  IF v_listing.id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF v_listing.poster_email != v_caller_email THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Permission denied: you do not own this listing';
    END IF;
  END IF;

  UPDATE listings SET status = p_new_status WHERE id = p_listing_id
  RETURNING * INTO v_listing;

  RETURN v_listing;
END;
$$;
