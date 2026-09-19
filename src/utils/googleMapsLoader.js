const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let loadPromise = null;

/**
 * Loads the Google Maps JS API (classic, with places + geometry libraries)
 * by injecting a <script> tag. Returns a Promise that resolves with `window.google`.
 *
 * Using direct script injection instead of @googlemaps/js-api-loader because
 * newer package versions removed the `Loader` class in favour of importLibrary().
 * Direct injection is simpler and fully backwards-compatible.
 */
export const loadGoogleMaps = () => {
  // Already resolved
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // Already on the page (e.g. hot reload)
    if (window.google?.maps) {
      resolve(window.google);
      return;
    }

    if (!API_KEY) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'));
      return;
    }

    const callbackName = '__googleMapsLoaded';

    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google);
    };

    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${API_KEY}` +
      `&libraries=places,geometry,marker` +
      `&callback=${callbackName}` +
      `&loading=async`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      loadPromise = null; // allow retry
      delete window[callbackName];
      reject(new Error('Google Maps script failed to load. Check your API key and enabled APIs in Google Cloud Console.'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

/**
 * Reverse-geocode a lat/lng.
 * Primary: Google Geocoding REST API (accurate city/suburb/postal resolution).
 * Fallback: OSM Nominatim (free, no API key needed — less accurate for suburbs).
 *
 * Returns { city, province, postalCode, formatted, countryCode } or null.
 * countryCode is ISO 3166-1 alpha-2 (e.g. 'CA', 'GB', 'NL') — used by the
 * country-aware postal code validator.
 */
export const reverseGeocode = async (lat, lng) => {
  // ── 1. Google Geocoding (primary — most accurate for suburbs) ─────────────
  if (API_KEY) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?latlng=${lat},${lng}` +
        `&key=${API_KEY}` +
        `&language=en`
      );
      const json = await res.json();
      if (json.status === 'OK' && json.results?.length) {
        // Merge components across all results (most-specific first) so we always
        // find the best city, province, postal and country match.
        const allComponents = json.results.flatMap(r => r.address_components || []);

        // long_name for display fields, short_name for ISO codes
        const getLong  = (types) => allComponents.find(c => types.some(t => c.types.includes(t)))?.long_name  || '';
        const getShort = (types) => allComponents.find(c => types.some(t => c.types.includes(t)))?.short_name || '';

        const city        = getLong(['locality', 'sublocality_level_1', 'sublocality', 'postal_town', 'neighborhood']);
        const province    = getLong(['administrative_area_level_1']);
        const postalCode  = getLong(['postal_code']);
        const formatted   = json.results[0].formatted_address || '';
        // short_name for 'country' gives ISO 3166-1 alpha-2 ('CA', 'GB', 'NL', …)
        const countryCode = getShort(['country']);

        if (city || province) {
          return { city, province, postalCode, formatted, countryCode };
        }
      }
    } catch {
      // fall through to Nominatim
    }
  }

  // ── 2. OSM Nominatim fallback (free, no API key) ──────────────────────────
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'DesiClassifieds/1.0' } }
    );
    if (res.ok) {
      const json = await res.json();
      const a = json.address || {};
      const city        = a.city || a.town || a.village || a.hamlet || a.suburb || a.county || '';
      const province    = a.state || '';
      const postalCode  = a.postcode || '';
      // Nominatim returns ISO 3166-1 alpha-2 in address.country_code (lowercase)
      const countryCode = (a.country_code || '').toUpperCase();
      if (city || province) {
        return { city, province, postalCode, formatted: json.display_name || '', countryCode };
      }
    }
  } catch {
    // nothing left to try
  }

  return null;
};

/** Returns a Google Static Maps image URL (no JS required). */
export const staticMapUrl = (lat, lng, zoom = 14, width = 400, height = 200) => {
  if (!API_KEY) return null;
  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}` +
    `&zoom=${zoom}` +
    `&size=${width}x${height}` +
    `&markers=color:red%7C${lat},${lng}` +
    `&style=feature:poi|visibility:off` +
    `&key=${API_KEY}`
  );
};
