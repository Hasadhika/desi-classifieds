import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps } from '@/utils/googleMapsLoader';
import { Loader2, MapPin } from 'lucide-react';
import { createPageUrl } from '@/utils';

/**
 * Google Map view for the Browse page.
 * Renders all listings with coordinates as clickable red pins.
 * Clicking a pin shows an info card; clicking the card navigates to the listing.
 */
export default function BrowseMapView({ listings = [], userLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  const validListings = listings.filter(l => l.latitude && l.longitude);

  const buildInfoContent = useCallback((listing) => {
    const price = listing.price != null ? `$${listing.price.toLocaleString()}` : 'Contact for price';
    const img = listing.images?.[0]
      ? `<img src="${listing.images[0]}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />`
      : '';
    const url = `${window.location.origin}${createPageUrl('ListingDetail')}?id=${listing.id}`;
    return `
      <div onclick="window.location.href='${url}'" style="max-width:210px;cursor:pointer;font-family:system-ui,sans-serif;padding:2px;">
        ${img}
        <div style="font-weight:600;font-size:13px;margin-bottom:3px;line-height:1.3;color:#1a1a1a;">${listing.title}</div>
        <div style="color:#D80621;font-weight:700;font-size:14px;">${price}</div>
        <div style="color:#888;font-size:11px;margin-top:2px;">${listing.city}, ${listing.province}</div>
        <div style="color:#D80621;font-size:11px;margin-top:6px;font-weight:500;">View listing →</div>
      </div>`;
  }, []);

  // Initialise map once
  useEffect(() => {
    loadGoogleMaps().then((google) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const centre = userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : { lat: 56.1304, lng: -106.3468 }; // Canada centre

      const map = new google.maps.Map(mapRef.current, {
        center: centre,
        zoom: userLocation ? 11 : 4,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
        gestureHandling: 'greedy',
        // mapId required for AdvancedMarkerElement. Replace with a real Cloud
        // Console mapId in production (create one at console.cloud.google.com).
        mapId: 'DEMO_MAP_ID',
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });

      infoWindowRef.current = new google.maps.InfoWindow();
      mapInstanceRef.current = map;
      setLoading(false);
    }).catch((err) => {
      console.error('[BrowseMapView] Failed to load Google Maps:', err);
      setLoading(false);
      setMapError(true);
    });
  }, []);

  // Re-render markers whenever listings change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    loadGoogleMaps().then((google) => {
      // Clear old markers — AdvancedMarkerElement removed by setting .map = null
      markersRef.current.forEach(m => { m.map = null; });
      markersRef.current = [];

      const bounds = new google.maps.LatLngBounds();
      const { AdvancedMarkerElement, PinElement } = google.maps.marker;

      validListings.forEach((listing) => {
        const position = { lat: listing.latitude, lng: listing.longitude };

        // PinElement gives us a styled pin with custom colours
        const pin = new PinElement({
          background: '#D80621',
          borderColor: '#B00520',
          glyphColor: '#ffffff',
          scale: 1.1,
        });

        const marker = new AdvancedMarkerElement({
          position,
          map: mapInstanceRef.current,
          title: listing.title,
          content: pin.element,
        });

        marker.addListener('click', () => {
          infoWindowRef.current.setContent(buildInfoContent(listing));
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        });

        markersRef.current.push(marker);
        bounds.extend(position);
      });

      if (validListings.length > 1 && !userLocation) {
        mapInstanceRef.current.fitBounds(bounds, { padding: 60 });
      } else if (validListings.length === 1) {
        mapInstanceRef.current.setCenter({ lat: validListings[0].latitude, lng: validListings[0].longitude });
        mapInstanceRef.current.setZoom(13);
      }
    });
  }, [listings, buildInfoContent]);

  if (mapError) {
    return (
      <div className="w-full rounded-2xl border border-gray-100 bg-gray-50 flex flex-col items-center justify-center text-center p-12" style={{ height: 560 }}>
        <MapPin className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="font-semibold text-gray-600 mb-1">Map unavailable</h3>
        <p className="text-sm text-gray-400 max-w-sm">
          Google Maps could not load. Ensure the Maps JavaScript API and Places API are enabled in Google Cloud Console and no referrer restrictions are blocking this domain.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-100" style={{ height: 560 }}>
      {loading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading map…</p>
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full" />

      {!loading && (
        <div className="absolute top-3 left-3 bg-white rounded-xl px-3 py-1.5 shadow-md border border-gray-100 text-xs text-gray-600 font-medium flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#D80621]" />
          {validListings.length} listings on map
          {listings.length - validListings.length > 0 && (
            <span className="text-gray-400">
              ({listings.length - validListings.length} without coordinates)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
