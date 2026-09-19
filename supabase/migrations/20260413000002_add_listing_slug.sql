-- ============================================================
-- Add SEO slug column to listings table
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → Run
-- ============================================================

-- 1. Add slug column
ALTER TABLE listings ADD COLUMN IF NOT EXISTS slug text;

-- 2. Unique index (allows NULLs so old rows don't block insert)
CREATE UNIQUE INDEX IF NOT EXISTS listings_slug_unique
  ON listings (slug)
  WHERE slug IS NOT NULL;

-- 3. Backfill slugs for all existing listings
--    Pattern: lowercase-hyphenated-title-{fullUUIDwithoutHyphens32chars}
--    The full UUID is embedded so the frontend can resolve by ID directly.
UPDATE listings
SET slug = REGEXP_REPLACE(
             REGEXP_REPLACE(
               LOWER(TRIM(COALESCE(title, 'listing'))),
               '[^a-z0-9\s-]', '', 'g'   -- strip special chars
             ),
             '\s+', '-', 'g'             -- spaces → hyphens
           )
           || '-'
           || REPLACE(id::text, '-', '')  -- full 32-char UUID, no hyphens
WHERE slug IS NULL;

-- 4. Index for fast slug lookups
CREATE INDEX IF NOT EXISTS listings_slug_idx ON listings (slug);
