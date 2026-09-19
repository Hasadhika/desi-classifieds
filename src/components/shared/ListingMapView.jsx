import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/utils/googleMapsLoader';
import { MapPin, Navigation, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Embedded Google Map for a listing detail page.
 * Shows an approximate 500 m radius circle to protect seller privacy.
 */
export default function ListingMapView({ lat, lng, title, city, province }) {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!lat || !lng) return;

    loadGoogleMaps()
      .then((google) => {
        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 13,
          mapTypeControl: false,
          fullscreenControl: true,
          streetViewControl: false,
          zoomControl: true,
          gestureHandling: 'cooperative',
          // mapId required for AdvancedMarkerElement.
          mapId: 'DEMO_MAP_ID',
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ],
        });

        // Privacy circle — approximate 500 m radius
        new google.maps.Circle({
          strokeColor: '#D80621',
          strokeOpacity: 0.6,
          strokeWeight: 2,
          fillColor: '#D80621',
          fillOpacity: 0.12,
          map,
          center: { lat, lng },
          radius: 500,
        });

        // Centre pin using AdvancedMarkerElement (replaces deprecated Marker)
        const { AdvancedMarkerElement, PinElement } = google.maps.marker;
        const pin = new PinElement({
          background: '#D80621',
          borderColor: '#B00520',
          glyphColor: '#ffffff',
        });
        new AdvancedMarkerElement({
          position: { lat, lng },
          map,
          title,
          content: pin.element,
        });

        setMapLoaded(true);
      })
      .catch(() => setError(true));
  }, [lat, lng]);

  if (!lat || !lng) return null;

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-[#D80621]" />
          <h3 className="font-semibold text-[#1A1A1A]">Location</h3>
        </div>
        <p className="text-sm text-gray-500 mb-1">{city}, {province}</p>
        <p className="text-xs text-red-500 mt-2">
          Map could not be loaded. Please check that the Maps JavaScript API is enabled in Google Cloud Console.
        </p>
      </div>
    );
  }

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const streetViewUrl = `https://www.google.com/maps?q=${lat},${lng}&layer=c`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#D80621]" />
          <h3 className="font-semibold text-[#1A1A1A]">Location</h3>
        </div>
        <div className="flex gap-2">
          <a href={streetViewUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
              <ExternalLink className="w-3.5 h-3.5" />
              Street View
            </Button>
          </a>
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="gap-1.5 h-8 text-xs bg-[#D80621] hover:bg-[#B00520] text-white">
              <Navigation className="w-3.5 h-3.5" />
              Get Directions
            </Button>
          </a>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        {city}, {province}
        <span className="text-xs text-gray-400 ml-2">(approximate area shown for privacy)</span>
      </p>

      {/* Map container */}
      <div className="relative w-full h-56 rounded-xl overflow-hidden bg-gray-100">
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
}
