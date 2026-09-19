/*
  # Add update_listing_status RPC function

  ## Purpose
  Creates a SECURITY DEFINER function that allows a listing owner to update
  their own listing's status. This bypasses the RLS WITH CHECK issue where
  auth.email() can sometimes return NULL from the JWT, causing the policy
  to block legitimate owner updates.

  ## Function
  - update_listing_status(listing_id uuid, new_status text)
  - Verifies the caller owns the listing via auth.uid() match on profiles
  - Only allows status values: 'active', 'sold', 'expired', 'pending'
  - Returns the updated listing row

  ## Security
  - SECURITY DEFINER runs as the function owner (superuser-level internally)
  - But explicitly checks ownership before updating — safe by design
  - Admins (role = 'admin' in profiles) can update any listing's status
*/

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
  IF p_new_status NOT IN ('active', 'sold', 'expired', 'pending', 'rejected') THEN
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
