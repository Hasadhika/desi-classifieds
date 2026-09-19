import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, ArrowRight, Loader2, LocateFixed, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { listingsApi } from "@/api/listingsApi";
import { useUserLocation } from "@/hooks/useUserLocation";
import ListingCard from "../shared/ListingCard";

export default function NearYouSection() {
  const { location, status, error, requestLocation } = useUserLocation();
  const [radius] = useState(25);

  const { data: nearbyListings = [], isLoading } = useQuery({
    queryKey: ["listings-nearby", location?.lat, location?.lng, radius],
    queryFn: () => listingsApi.getNearby(location.lat, location.lng, radius, 8),
    enabled: !!location,
    staleTime: 5 * 60 * 1000,
  });

  if (status === "idle") {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">See listings near you</h3>
              <p className="text-sm text-gray-500">Allow location access to discover ads in your area</p>
            </div>
          </div>
          <Button
            onClick={requestLocation}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 shrink-0"
          >
            <LocateFixed className="w-4 h-4 mr-2" />
            Allow Location
          </Button>
        </div>
      </section>
    );
  }

  if (status === "requesting") {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-600">Getting your location...</p>
        </div>
      </section>
    );
  }

  if (status === "denied" || status === "error") {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Location unavailable</p>
            <p className="text-xs text-amber-600 mt-0.5">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={requestLocation}
            className="ml-auto shrink-0 border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            Retry
          </Button>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-gray-100 rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                <div className="h-5 w-1/3 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (nearbyListings.length === 0) {
    return null;
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Near You</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">Listings Near You</h2>
          <p className="text-gray-500 mt-1">Within {radius} km of your current location</p>
        </div>
        <Link
          to={createPageUrl("Browse") + `?nearme=1&radius=${radius}`}
          className="hidden sm:flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
        >
          See all nearby <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {nearbyListings.slice(0, 4).map(listing => (
          <ListingCard
            key={listing.id}
            listing={listing}
            distanceKm={listing.distance_km}
          />
        ))}
      </div>

      <Link
        to={createPageUrl("Browse") + `?nearme=1&radius=${radius}`}
        className="sm:hidden flex items-center justify-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm mt-6 transition-colors"
      >
        See all nearby <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}
