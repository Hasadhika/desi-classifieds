/*
  # Fix Moderation Trigger

  Rewrites check_listing_moderation() with a cleaner approach:
  - Uses EXISTS + LIKE instead of a FOR loop (avoids PL/pgSQL record/scalar ambiguity)
  - Fixes potential type issue with loop variable in keyword check
*/

CREATE OR REPLACE FUNCTION check_listing_moderation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_content       text;
  v_spam_enabled  text;
  v_spam_limit    integer;
  v_spam_count    integer;
  v_dup_enabled   text;
  v_dup_threshold numeric;
BEGIN
  -- Only intercept listings going to pending status
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Build lowercase searchable content
  v_content := lower(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));

  -- ── A. Blocked keyword check ─────────────────────────────────────────────
  -- Use EXISTS + LIKE to avoid FOR-loop record/scalar type issues
  IF EXISTS (
    SELECT 1 FROM blocked_keywords
    WHERE v_content LIKE '%' || lower(keyword) || '%'
  ) THEN
    NEW.status := 'flagged';
    RETURN NEW;
  END IF;

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

-- Re-attach trigger (in case it wasn't created before)
DROP TRIGGER IF EXISTS listing_moderation_trigger ON listings;
CREATE TRIGGER listing_moderation_trigger
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION check_listing_moderation();
