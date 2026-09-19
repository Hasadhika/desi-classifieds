import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "user_location_cache";
const CACHE_TTL_MS = 15 * 60 * 1000;

function loadCached() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(lat, lng) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lng, timestamp: Date.now() }));
  } catch {}
}

export function useUserLocation() {
  const [location, setLocation] = useState(() => {
    const cached = loadCached();
    return cached ? { lat: cached.lat, lng: cached.lng } : null;
  });
  const [status, setStatus] = useState(() => (loadCached() ? "granted" : "idle"));
  const [error, setError] = useState(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setStatus("error");
      return;
    }

    setStatus("requesting");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        saveCache(latitude, longitude);
        setLocation({ lat: latitude, lng: longitude });
        setStatus("granted");
      },
      (err) => {
        if (err.code === 1) {
          setError("Location access denied. Please allow location in your browser settings.");
          setStatus("denied");
        } else if (err.code === 2) {
          setError("Unable to determine your location. Please try again.");
          setStatus("error");
        } else {
          setError("Location request timed out.");
          setStatus("error");
        }
      },
      // enableHighAccuracy: true → forces GPS chip, not WiFi/cell triangulation (±5–20m vs ±500m–2km)
      // maximumAge: 30000 → device may not return a cached fix older than 30s; our own
      //   sessionStorage cache handles UX-level caching to avoid repeat permission prompts
      { timeout: 15000, maximumAge: 30000, enableHighAccuracy: true }
    );
  }, []);

  return { location, status, error, requestLocation };
}
