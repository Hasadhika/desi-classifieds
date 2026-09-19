/*
  # Improve listings_within_radius Accuracy

  ## Problem
  The previous implementation used the spherical law of cosines:
    6371 * acos(LEAST(1, cos*cos*cos + sin*sin))

  This formula suffers from catastrophic cancellation when distances are small
  (< 1 km) because acos of a value very close to 1.0 loses floating-point
  precision.  This caused:
    - Listings at short distances showing wrong/inconsistent distances
    - "Slightly outside radius" inclusions due to rounding in the WHERE clause
    - Mismatch with the client-side Haversine formula (which correctly uses atan2)

  ## Fix
  Replace with the Haversine formula using asin/sqrt, which is numerically
  stable at all distances and matches the JavaScript calculateDistance() helper:

    d = 2R * asin( sqrt(
          sin²(Δlat/2)
          + cos(lat1) * cos(lat2) * sin²(Δlng/2)
        ))

  ## Additional improvement
  Added an optional `category_filter` parameter (default NULL = no filter).
  Previously, category filtering was done client-side *after* the DB returned
  up to 100 rows, which could silently drop nearby listings that were past the
  LIMIT.  Passing the filter to SQL ensures the LIMIT applies only after the
  category constraint, so callers always get the correct nearest N results.
*/

CREATE OR REPLACE FUNCTION listings_within_radius(
  user_lat        double precision,
  user_lng        double precision,
  radius_km       double precision,
  lim             integer DEFAULT 50,
  category_filter text    DEFAULT NULL
)
RETURNS TABLE (
  id                 uuid,
  title              text,
  description        text,
  price              numeric,
  price_type         text,
  category           text,
  subcategory        text,
  province           text,
  city               text,
  postal_code        text,
  latitude           double precision,
  longitude          double precision,
  location_source    text,
  images             text[],
  status             text,
  is_featured        boolean,
  is_urgent          boolean,
  is_verified        boolean,
  poster_name        text,
  poster_email       text,
  created_by         text,
  contact_phone      text,
  contact_whatsapp   text,
  contact_preference text,
  views              integer,
  created_date       timestamptz,
  distance_km        double precision
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
    -- Haversine formula (numerically stable at all distances, matches JS helper)
    2.0 * 6371.0 * asin(
      sqrt(
        power(sin((radians(l.latitude)  - radians(user_lat))  / 2.0), 2) +
        cos(radians(user_lat)) * cos(radians(l.latitude)) *
        power(sin((radians(l.longitude) - radians(user_lng))  / 2.0), 2)
      )
    ) AS distance_km
  FROM listings l
  WHERE
    l.status = 'active'
    AND l.latitude  IS NOT NULL
    AND l.longitude IS NOT NULL
    -- Optional category pre-filter (avoids client-side truncation at LIMIT)
    AND (category_filter IS NULL OR l.category = category_filter)
    -- Haversine radius gate (same formula, no LEAST() hack needed)
    AND 2.0 * 6371.0 * asin(
          sqrt(
            power(sin((radians(l.latitude)  - radians(user_lat))  / 2.0), 2) +
            cos(radians(user_lat)) * cos(radians(l.latitude)) *
            power(sin((radians(l.longitude) - radians(user_lng))  / 2.0), 2)
          )
        ) <= radius_km
  ORDER BY distance_km ASC
  LIMIT lim;
$$;
