/*
  # update_listing_content RPC
  Allows listing owners to update their own pending listing content.
  SECURITY DEFINER bypasses the JWT auth.email() NULL issue (same pattern as update_listing_status).
*/

CREATE OR REPLACE FUNCTION update_listing_content(
  p_listing_id         uuid,
  p_title              text,
  p_description        text,
  p_price              numeric,
  p_price_type         text,
  p_subcategory        text,
  p_province           text,
  p_city               text,
  p_postal_code        text,
  p_contact_phone      text,
  p_contact_whatsapp   text,
  p_contact_preference text,
  p_images             text[],
  p_latitude           double precision DEFAULT NULL,
  p_longitude          double precision DEFAULT NULL,
  p_location_source    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Resolve caller email from profiles (avoids JWT NULL issue)
  SELECT email INTO v_email FROM profiles WHERE id = auth.uid();
  IF v_email IS NULL THEN
    v_email := auth.email();
  END IF;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check ownership (admins bypass)
  IF NOT EXISTS (
    SELECT 1 FROM listings WHERE id = p_listing_id AND poster_email = v_email
  ) AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Update listing content and reset to pending
  UPDATE listings SET
    title               = p_title,
    description         = p_description,
    price               = p_price,
    price_type          = p_price_type,
    subcategory         = p_subcategory,
    province            = p_province,
    city                = p_city,
    postal_code         = p_postal_code,
    contact_phone       = p_contact_phone,
    contact_whatsapp    = p_contact_whatsapp,
    contact_preference  = p_contact_preference,
    images              = p_images,
    status              = 'pending',
    latitude            = COALESCE(p_latitude, latitude),
    longitude           = COALESCE(p_longitude, longitude),
    location_source     = COALESCE(p_location_source, location_source)
  WHERE id = p_listing_id;
END;
$$;
