/*
  # Add edit_count to listings and icon_url to categories

  1. listings.edit_count   — tracks how many times owner has edited a pending listing (max 3)
  2. categories.icon_url   — URL of an image uploaded by admin to use as category icon
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'edit_count'
  ) THEN
    ALTER TABLE listings ADD COLUMN edit_count integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'icon_url'
  ) THEN
    ALTER TABLE categories ADD COLUMN icon_url text;
  END IF;
END $$;
