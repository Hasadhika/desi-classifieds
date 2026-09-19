/*
  # Add Geolocation to Listings

  ## Summary
  Adds geographic coordinate columns to the listings table to enable location-based features:
  - "Listings Near You" on the home page for signed-in users
  - "Search Near Me" radius filtering on the browse page
  - Distance display on listing cards

  ## Changes

  ### Modified Tables
  - `listings`
    - `latitude` (double precision, nullable) - GPS latitude of the listing location
    - `longitude` (double precision, nullable) - GPS longitude of the listing location
    - `location_source` (text, nullable) - How coordinates were obtained: 'browser_gps', 'postal_code', 'city_lookup'

  ## New Functions
  - `listings_within_radius(user_lat, user_lng, radius_km, lim)` - Returns listings within a given radius using Haversine formula, ordered by distance

  ## Notes
  - Coordinates are nullable: existing listings without coordinates still work
  - The Haversine formula is computed in SQL for performance
  - No paid APIs required: coordinates come from browser geolocation or free OSM Nominatim geocoding
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE listings ADD COLUMN latitude double precision;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE listings ADD COLUMN longitude double precision;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'location_source'
  ) THEN
    ALTER TABLE listings ADD COLUMN location_source text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS listings_lat_lng_idx ON listings (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE OR REPLACE FUNCTION listings_within_radius(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision,
  lim integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price numeric,
  price_type text,
  category text,
  subcategory text,
  province text,
  city text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  location_source text,
  images text[],
  status text,
  is_featured boolean,
  is_urgent boolean,
  is_verified boolean,
  poster_name text,
  poster_email text,
  created_by text,
  contact_phone text,
  contact_whatsapp text,
  contact_preference text,
  views integer,
  created_date timestamptz,
  distance_km double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    l.id,
    l.title,
    l.description,
    l.price,
    l.price_type,
    l.category,
    l.subcategory,
    l.province,
    l.city,
    l.postal_code,
    l.latitude,
    l.longitude,
    l.location_source,
    l.images,
    l.status,
    l.is_featured,
    l.is_urgent,
    l.is_verified,
    l.poster_name,
    l.poster_email,
    l.created_by,
    l.contact_phone,
    l.contact_whatsapp,
    l.contact_preference,
    l.views,
    l.created_date,
    (
      6371 * acos(
        LEAST(1.0, cos(radians(user_lat)) * cos(radians(l.latitude))
        * cos(radians(l.longitude) - radians(user_lng))
        + sin(radians(user_lat)) * sin(radians(l.latitude)))
      )
    ) AS distance_km
  FROM listings l
  WHERE
    l.status = 'active'
    AND l.latitude IS NOT NULL
    AND l.longitude IS NOT NULL
    AND (
      6371 * acos(
        LEAST(1.0, cos(radians(user_lat)) * cos(radians(l.latitude))
        * cos(radians(l.longitude) - radians(user_lng))
        + sin(radians(user_lat)) * sin(radians(l.latitude)))
      )
    ) <= radius_km
  ORDER BY distance_km ASC
  LIMIT lim;
$$;
