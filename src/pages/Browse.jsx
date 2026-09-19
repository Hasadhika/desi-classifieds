import React, { useState, useMemo, useEffect } from "react";
import { listingsApi } from "@/api/listingsApi";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, Search, LocateFixed, Loader2, X, Map, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import ListingCard from "../components/shared/ListingCard";
import FilterSidebar from "../components/browse/FilterSidebar";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useAuth } from "@/lib/AuthContext";
import BrowseRestrictionWall, { useBrowseRestriction } from "@/components/shared/BrowseRestrictionWall";
import BrowseMapView from "@/components/browse/BrowseMapView";

const RADIUS_OPTIONS = [
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "50 km", value: 50 },
];

export default function Browse() {
  const { isAuthenticated } = useAuth();
  const { isBlocked } = useBrowseRestriction(isAuthenticated);
  const urlParams = new URLSearchParams(window.location.search);
  const initNearMe = urlParams.get("nearme") === "1";
  const initRadius = parseInt(urlParams.get("radius")) || 25;

  const [filters, setFilters] = useState({
    q: urlParams.get("q") || "",
    category: urlParams.get("category") || "",
    subcategory: "",
    province: urlParams.get("province") || "",
    city: "",
    sort: "-created_date",
    minPrice: "",
    maxPrice: "",
  });

  const [nearMeActive, setNearMeActive] = useState(initNearMe);
  const [nearMeRadius, setNearMeRadius] = useState(initRadius);
  const [viewMode, setViewMode] = useState("list"); // "list" | "map"

  const { location, status, error, requestLocation } = useUserLocation();

  useEffect(() => {
    if (initNearMe && status === "idle") {
      requestLocation();
    }
  }, []);

  useEffect(() => {
    if (initNearMe && location) {
      setNearMeActive(true);
    }
  }, [location, initNearMe]);

  const handleNearMeToggle = () => {
    if (nearMeActive) {
      setNearMeActive(false);
    } else {
      if (location) {
        setNearMeActive(true);
      } else {
        requestLocation();
      }
    }
  };

  useEffect(() => {
    if (status === "granted" && location && !nearMeActive && initNearMe) {
      setNearMeActive(true);
    }
  }, [status, location]);

  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["browse-listings", filters.category, filters.province, filters.sort],
    queryFn: async () => {
      let q = supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .limit(200);

      if (filters.category && filters.category !== "all_categories") q = q.eq('category', filters.category);
      if (filters.province && filters.province !== "all_provinces") q = q.eq('province', filters.province);

      const isDescending = filters.sort?.startsWith('-');
      const col = isDescending ? filters.sort.substring(1) : (filters.sort || 'created_date');
      q = q.order(col, { ascending: !isDescending });

      const { data, error } = await q;
      if (error) {
        console.error('[Browse] listings query error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !nearMeActive,
  });

  const { data: nearbyListings = [], isLoading: nearbyLoading } = useQuery({
    queryKey: ["browse-nearby", location?.lat, location?.lng, nearMeRadius, filters.category],
    queryFn: async () => {
      // Category is pushed into SQL so the LIMIT applies after filtering.
      // Previously this was done client-side, which could silently drop
      // listings that fell past the 100-row cap before category filtering.
      return listingsApi.getNearby(
        location.lat,
        location.lng,
        nearMeRadius,
        100,
        filters.category || null,
      );
    },
    enabled: nearMeActive && !!location,
    // No staleTime: location/radius/category changes always fetch fresh data.
    staleTime: 0,
  });

  const isLoading = nearMeActive ? nearbyLoading : listingsLoading;

  const activeListings = nearMeActive ? nearbyListings : listings;

  const filteredListings = useMemo(() => {
    let result = activeListings;

    if (filters.q) {
      const q = filters.q.toLowerCase();
      result = result.filter(l =>
        l.title?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q)
      );
    }

    if (filters.subcategory && filters.subcategory !== "all_sub") {
      result = result.filter(l => l.subcategory === filters.subcategory);
    }

    if (filters.city && filters.city !== "all_cities") {
      const cityQ = filters.city.toLowerCase().trim();
      result = result.filter(l => l.city?.toLowerCase().includes(cityQ));
    }

    const min = filters.minPrice !== "" ? Number(filters.minPrice) : null;
    const max = filters.maxPrice !== "" ? Number(filters.maxPrice) : null;
    if (min !== null) result = result.filter(l => l.price != null && l.price >= min);
    if (max !== null) result = result.filter(l => l.price != null && l.price <= max);

    // Near Me results come from SQL ordered by distance_km. For price/date
    // sorts we re-sort client-side; 'distance' means keep SQL order as-is.
    if (nearMeActive) {
      if (filters.sort === "price") {
        result = [...result].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      } else if (filters.sort === "-price") {
        result = [...result].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
      } else if (filters.sort === "-created_date") {
        result = [...result].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      }
      // filters.sort === 'distance' → leave SQL distance ordering intact
    }

    return result;
  }, [activeListings, filters.q, filters.subcategory, filters.city, filters.sort, nearMeActive, filters.minPrice, filters.maxPrice]);

  const isRequestingLocation = status === "requesting";

  return (
    <div className="page-enter min-h-screen bg-[#F8F8F8]">
      {isBlocked && <BrowseRestrictionWall />}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search listings..."
              value={filters.q}
              onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
              className="pl-10 h-10 bg-gray-50 border-gray-200 rounded-xl"
            />
          </div>

          <Button
            variant={nearMeActive ? "default" : "outline"}
            onClick={handleNearMeToggle}
            disabled={isRequestingLocation}
            className={`h-10 rounded-xl shrink-0 gap-2 ${
              nearMeActive
                ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                : "border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {isRequestingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isRequestingLocation ? "Locating..." : nearMeActive ? "Near Me" : "Near Me"}
            </span>
            {nearMeActive && (
              <span
                onClick={(e) => { e.stopPropagation(); setNearMeActive(false); }}
                className="ml-1 hover:bg-blue-700 rounded-full p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </Button>

          {/* Map / List toggle */}
          <div className="hidden sm:flex items-center border border-gray-200 rounded-xl overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={`h-10 px-3 flex items-center gap-1.5 text-sm transition-colors ${viewMode === "list" ? "bg-[#D80621] text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`h-10 px-3 flex items-center gap-1.5 text-sm transition-colors border-l border-gray-200 ${viewMode === "map" ? "bg-[#D80621] text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <Map className="w-4 h-4" />
              <span className="hidden md:inline">Map</span>
            </button>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden h-10 rounded-xl">
                <SlidersHorizontal className="w-4 h-4 mr-2" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-6">
              <FilterSidebar
                filters={filters}
                setFilters={setFilters}
                nearMeActive={nearMeActive}
                nearMeRadius={nearMeRadius}
                setNearMeRadius={setNearMeRadius}
                onNearMeToggle={handleNearMeToggle}
                locationStatus={status}
                locationError={error}
              />
            </SheetContent>
          </Sheet>
        </div>

        {nearMeActive && location && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-blue-600 font-medium">Showing within:</span>
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setNearMeRadius(opt.value)}
                className={`text-xs px-3 py-1 rounded-full transition-all ${
                  nearMeRadius === opt.value
                    ? "bg-blue-600 text-white font-medium"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {nearMeActive && !location && status === "denied" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3">
            <p className="text-xs text-amber-600">{error} <button onClick={requestLocation} className="underline ml-1">Retry</button></p>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
              <FilterSidebar
                filters={filters}
                setFilters={setFilters}
                nearMeActive={nearMeActive}
                nearMeRadius={nearMeRadius}
                setNearMeRadius={setNearMeRadius}
                onNearMeToggle={handleNearMeToggle}
                locationStatus={status}
                locationError={error}
              />
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                {isLoading
                  ? "Loading..."
                  : nearMeActive && location
                  ? `${filteredListings.length} listings within ${nearMeRadius} km`
                  : `${filteredListings.length} listings found`
                }
              </p>
              {/* Mobile map/list toggle */}
              <div className="flex sm:hidden items-center border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setViewMode("list")} className={`h-8 px-3 flex items-center gap-1 text-xs transition-colors ${viewMode === "list" ? "bg-[#D80621] text-white" : "text-gray-600"}`}>
                  <List className="w-3.5 h-3.5" /> List
                </button>
                <button onClick={() => setViewMode("map")} className={`h-8 px-3 flex items-center gap-1 text-xs border-l border-gray-200 transition-colors ${viewMode === "map" ? "bg-[#D80621] text-white" : "text-gray-600"}`}>
                  <Map className="w-3.5 h-3.5" /> Map
                </button>
              </div>
            </div>

            {/* ── Map View ── */}
            {viewMode === "map" && !isLoading && (
              <BrowseMapView listings={filteredListings} userLocation={location} />
            )}

            {/* ── List View ── */}
            {viewMode === "list" && (
              isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                      <Skeleton className="aspect-[4/3]" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] text-lg">No listings found</h3>
                  <p className="text-gray-500 mt-1 text-sm">
                    {nearMeActive
                      ? `No listings found within ${nearMeRadius} km. Try a larger radius.`
                      : "Try adjusting your filters or search terms"
                    }
                  </p>
                  {nearMeActive && (
                    <button
                      onClick={() => setNearMeRadius(50)}
                      className="mt-3 text-sm text-blue-600 hover:underline"
                    >
                      Expand to 50 km
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredListings.map(listing => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      distanceKm={nearMeActive ? listing.distance_km : undefined}
                    />
                  ))}
                </div>
              )
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
