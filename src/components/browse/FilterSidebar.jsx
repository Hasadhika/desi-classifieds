import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, SlidersHorizontal, LocateFixed, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { categoriesApi } from "@/api/categoriesApi";
import { CANADIAN_PROVINCES, MAJOR_CITIES } from "@/utils/locationUtils";

const RADIUS_OPTIONS = [
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "50 km", value: 50 },
];

export default function FilterSidebar({
  filters,
  setFilters,
  onClose,
  nearMeActive = false,
  nearMeRadius = 25,
  setNearMeRadius,
  onNearMeToggle,
  locationStatus,
  locationError,
}) {
  const { data: categories = [] } = useQuery({
    queryKey: ["parentCategories"],
    queryFn: () => categoriesApi.getParentCategories(),
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories", filters.category],
    queryFn: () => categoriesApi.getSubcategoriesByParent(filters.category),
    enabled: !!filters.category && filters.category !== "all_categories",
  });

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ q: "", category: "", subcategory: "", province: "", city: "", sort: "-created_date", minPrice: "", maxPrice: "" });
  };

  const cities = MAJOR_CITIES[filters.province] || [];
  const isRequestingLocation = locationStatus === "requesting";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-[#1A1A1A]">Filters</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearFilters} className="text-xs text-[#D80621] hover:underline">Clear all</button>
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {onNearMeToggle && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</Label>
          <button
            onClick={onNearMeToggle}
            disabled={isRequestingLocation}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              nearMeActive
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            {isRequestingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
            {isRequestingLocation ? "Getting location..." : nearMeActive ? "Near Me (active)" : "Search Near Me"}
          </button>

          {nearMeActive && setNearMeRadius && (
            <div className="mt-2">
              <Label className="text-xs text-gray-500 mb-1.5 block">Radius</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {RADIUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setNearMeRadius(opt.value)}
                    className={`text-xs py-1.5 rounded-lg transition-all font-medium ${
                      nearMeRadius === opt.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {locationStatus === "denied" && (
            <p className="text-xs text-amber-600 mt-1">{locationError}</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</Label>
          <Select value={filters.category} onValueChange={(v) => { updateFilter("category", v); updateFilter("subcategory", ""); }}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all_categories">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {subcategories.length > 0 && (
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategory</Label>
            <Select value={filters.subcategory} onValueChange={(v) => updateFilter("subcategory", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_sub">All</SelectItem>
                {subcategories.map(s => <SelectItem key={s.slug} value={s.label}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {!nearMeActive && (
          <>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Province</Label>
              <Select value={filters.province} onValueChange={(v) => { updateFilter("province", v); updateFilter("city", ""); }}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="All Provinces" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_provinces">All Provinces</SelectItem>
                  {CANADIAN_PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {filters.province && filters.province !== "all_provinces" && (
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">City</Label>
                <Input
                  placeholder="Any city"
                  value={filters.city === "all_cities" ? "" : (filters.city || "")}
                  onChange={(e) => updateFilter("city", e.target.value || "")}
                  className="mt-1.5 h-9 text-sm"
                  list="filter-city-suggestions"
                />
                {cities.length > 0 && (
                  <datalist id="filter-city-suggestions">
                    {cities.map(c => <option key={c} value={c} />)}
                  </datalist>
                )}
              </div>
            )}
          </>
        )}

        <div>
          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Price Range (CAD)</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <Input
              type="number"
              min="0"
              placeholder="Min $"
              value={filters.minPrice ?? ""}
              onChange={(e) => updateFilter("minPrice", e.target.value)}
              className="h-9 text-sm"
            />
            <span className="text-gray-400 text-sm shrink-0">–</span>
            <Input
              type="number"
              min="0"
              placeholder="Max $"
              value={filters.maxPrice ?? ""}
              onChange={(e) => updateFilter("maxPrice", e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {!nearMeActive && (
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sort By</Label>
            <Select value={filters.sort} onValueChange={(v) => updateFilter("sort", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="-created_date">Newest First</SelectItem>
                {nearMeActive && (
                  <SelectItem value="distance">Nearest First</SelectItem>
                )}
                <SelectItem value="price">Price: Low to High</SelectItem>
                <SelectItem value="-price">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
