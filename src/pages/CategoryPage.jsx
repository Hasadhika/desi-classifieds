import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useSEO } from "@/hooks/useSEO";
import {
  SLUG_TO_CATEGORY,
  slugToProvince,
  createCategoryUrl,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_SLUGS,
} from "@/utils/slugify";
import ListingCard from "@/components/shared/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronRight, Grid3X3 } from "lucide-react";
import { CANADIAN_PROVINCES } from "@/utils/locationUtils";

const ALL_CATEGORIES = Object.keys(CATEGORY_SLUGS);

export default function CategoryPage() {
  const { catSlug, provSlug } = useParams();

  const category = SLUG_TO_CATEGORY[catSlug];
  const province = provSlug ? slugToProvince(provSlug) : null;

  const categoryLabel = CATEGORY_LABELS[category] || catSlug;
  const locationLabel  = province || "Canada";

  const pageTitle = province
    ? `${categoryLabel} in ${province} – DesiClassifieds`
    : `${categoryLabel} Listings in Canada – DesiClassifieds`;

  const metaDesc = province
    ? `Browse ${categoryLabel.toLowerCase()} listings in ${province}. Find the best deals posted by Canada's South Asian community on DesiClassifieds.`
    : `Browse all ${categoryLabel.toLowerCase()} listings across Canada. ${CATEGORY_DESCRIPTIONS[category] || ''} Posted by South Asians, for South Asians.`;

  useSEO({
    title: pageTitle,
    description: metaDesc,
    canonicalUrl: `${window.location.origin}${window.location.pathname}`,
  });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["category-page", category, province],
    queryFn: async () => {
      if (!category) return [];
      let q = supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .eq("category", category)
        .order("created_date", { ascending: false })
        .limit(120);
      if (province) q = q.eq("province", province);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!category,
    staleTime: 2 * 60 * 1000,
  });

  // Unknown category → friendly 404
  if (!category) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Grid3X3 className="w-8 h-8 text-gray-300" />
          </div>
          <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Page not found</h1>
          <p className="text-gray-500 text-sm mb-4">This category doesn't exist.</p>
          <Link to="/Browse" className="text-[#D80621] hover:underline text-sm font-medium">
            Browse all listings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      {/* Header band */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-3" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-[#D80621] transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
            {province ? (
              <>
                <Link to={`/${catSlug}`} className="hover:text-[#D80621] transition-colors">
                  {categoryLabel}
                </Link>
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-[#1A1A1A] font-medium">{province}</span>
              </>
            ) : (
              <span className="text-[#1A1A1A] font-medium">{categoryLabel}</span>
            )}
          </nav>

          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            {categoryLabel} in {locationLabel}
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">{CATEGORY_DESCRIPTIONS[category]}</p>

          {/* Province filter pills — show when on category-only page */}
          {!province && (
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-xs text-gray-400 self-center">Browse by province:</span>
              {CANADIAN_PROVINCES.map(p => (
                <Link
                  key={p}
                  to={createCategoryUrl(category, p)}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-[#D80621] hover:text-white text-gray-600 rounded-full transition-colors font-medium"
                >
                  {p}
                </Link>
              ))}
            </div>
          )}

          {/* All-categories cross-links — when on a province page */}
          {province && (
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-xs text-gray-400 self-center">Other categories in {province}:</span>
              {ALL_CATEGORIES.filter(c => c !== category).map(c => (
                <Link
                  key={c}
                  to={createCategoryUrl(c, province)}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-[#D80621] hover:text-white text-gray-600 rounded-full transition-colors font-medium"
                >
                  {CATEGORY_LABELS[c]}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array(8).fill(0).map((_, i) => (
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
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-semibold text-[#1A1A1A] text-lg">No listings yet</h3>
            <p className="text-gray-500 mt-1 text-sm">
              {province
                ? `No ${categoryLabel.toLowerCase()} listings in ${province} yet.`
                : `No ${categoryLabel.toLowerCase()} listings in Canada yet.`}
            </p>
            <Link to="/PostAd" className="mt-4 inline-block text-sm text-[#D80621] hover:underline font-medium">
              Post the first listing →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-5">
              {listings.length} {categoryLabel.toLowerCase()} listing{listings.length !== 1 ? 's' : ''}{province ? ` in ${province}` : ' across Canada'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* JSON-LD structured data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": pageTitle,
            "description": metaDesc,
            "url": typeof window !== 'undefined' ? window.location.href : '',
            "numberOfItems": listings.length,
          }),
        }}
      />
    </div>
  );
}
