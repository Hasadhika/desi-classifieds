import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ListingCard from "../shared/ListingCard";

export default function ListingSection({
  title,
  subtitle,
  listings,
  isLoading = false,
  linkParams = "",
  accentColor = "#D80621",
  badge,
}) {
  if (!isLoading && !listings?.length) return null;

  const browseUrl = createPageUrl("Browse") + (linkParams ? `?${linkParams}` : "");

  return (
    <section className="py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            {badge && (
              <span className="inline-block text-xs font-bold tracking-widest uppercase mb-2"
                style={{ color: accentColor }}>
                {badge}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight leading-none">
              {title}
            </h2>
            {subtitle && (
              <p className="text-gray-500 text-sm mt-1.5">{subtitle}</p>
            )}
          </div>
          <Link
            to={browseUrl}
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
            style={{ color: accentColor }}
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array(4).fill(0).map((_, i) => (
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {listings.slice(0, 4).map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Mobile view-all */}
        <Link
          to={browseUrl}
          className="sm:hidden flex items-center justify-center gap-1.5 font-semibold text-sm mt-6 transition-colors hover:opacity-80"
          style={{ color: accentColor }}
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
