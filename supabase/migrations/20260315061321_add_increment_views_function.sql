/*
  # Add increment listing views function

  1. New Functions
    - `increment_listing_views` - Safely increments the view count for a listing
  
  2. Purpose
    - Provides atomic view counter increment
    - Used when users view listing detail pages
*/

CREATE OR REPLACE FUNCTION increment_listing_views(listing_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE listings
  SET views = COALESCE(views, 0) + 1
  WHERE id = listing_id;
END;
$$;
