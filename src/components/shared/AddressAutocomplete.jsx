import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/utils/googleMapsLoader';
import { MapPin, Loader2 } from 'lucide-react';

/**
 * Google Places Autocomplete input.
 *
 * Props
 * ─────
 * onPlaceSelect(result)  – called when user picks a suggestion.
 *   result: { city, province, postalCode, countryCode, lat, lng, formatted }
 *   countryCode is ISO 3166-1 alpha-2 (e.g. 'CA', 'GB', 'NL') — use it to
 *   drive country-aware postal code validation in the parent form.
 *
 * countryRestrictions    – optional ISO code or array of codes to restrict
 *   suggestions (e.g. 'ca', ['ca','us']).  Omit (or pass null) for worldwide.
 *   Pass 'ca' for pages that are Canada-only.
 */
export default function AddressAutocomplete({
  onPlaceSelect,
  placeholder = 'Search city, area or postal code…',
  defaultValue = '',
  countryRestrictions = null,
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    loadGoogleMaps()
      .then((google) => {
        setLoading(false);
        if (!inputRef.current) return;

        const options = {
          types: ['geocode'],
          fields: ['address_components', 'geometry', 'formatted_address', 'name'],
        };

        // Apply country restriction only when explicitly provided.
        // This allows PostAdForm to remain worldwide while other pages (e.g. a
        // Canada-only search bar) can still pass countryRestrictions='ca'.
        if (countryRestrictions) {
          options.componentRestrictions = {
            country: Array.isArray(countryRestrictions)
              ? countryRestrictions.map(c => c.toLowerCase())
              : countryRestrictions.toLowerCase(),
          };
        }

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, options);
        autocompleteRef.current = autocomplete;

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place?.geometry?.location) return;

          const components = place.address_components || [];

          // long_name for human-readable fields, short_name for ISO codes
          const getLong  = (types) => components.find(c => types.some(t => c.types.includes(t)))?.long_name  || '';
          const getShort = (types) => components.find(c => types.some(t => c.types.includes(t)))?.short_name || '';

          // For townships/villages `locality` may be absent — fall back to place.name.
          const city =
            getLong(['locality', 'sublocality_level_1', 'sublocality', 'postal_town']) ||
            place.name ||
            '';

          const result = {
            city,
            province:    getLong(['administrative_area_level_1']),
            postalCode:  getLong(['postal_code']),
            // ISO 3166-1 alpha-2 — the key input for postal code validation
            countryCode: getShort(['country']),
            lat:         place.geometry.location.lat(),
            lng:         place.geometry.location.lng(),
            formatted:   place.formatted_address || '',
          };

          setInputValue(result.formatted);
          onPlaceSelect(result);
        });
      })
      .catch(() => setLoading(false));

    return () => {
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  // countryRestrictions intentionally excluded from deps: the autocomplete
  // instance is created once on mount; restriction changes would need a remount.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="relative">
        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        <input
          disabled
          placeholder="Loading location search…"
          className="w-full h-10 pl-10 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D80621] z-10 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-3 rounded-md border border-gray-200 bg-white text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#D80621] focus:border-transparent transition-colors"
        autoComplete="off"
      />
    </div>
  );
}
