const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const cache = new Map();

async function googleGeocode(query) {
  const key = query.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key);

  if (!API_KEY) return null;

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${API_KEY}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 'OK' || !json.results?.length) return null;

    const loc = json.results[0].geometry.location;
    const result = { lat: loc.lat, lng: loc.lng };
    cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

export async function geocodePostalCode(postalCode) {
  if (!postalCode) return null;
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
  if (cleaned.length < 3) return null;
  return googleGeocode(`${cleaned}, Canada`);
}

export async function geocodeCity(city, province) {
  if (!city) return null;
  const query = province ? `${city}, ${province}, Canada` : `${city}, Canada`;
  return googleGeocode(query);
}

export async function getBestCoordinates(postalCode, city, province) {
  if (postalCode && postalCode.replace(/\s/g, '').length >= 3) {
    const coords = await geocodePostalCode(postalCode);
    if (coords) return { ...coords, source: 'postal_code' };
  }
  if (city) {
    const coords = await geocodeCity(city, province);
    if (coords) return { ...coords, source: 'city_lookup' };
  }
  return null;
}

export function formatDistance(km) {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}
