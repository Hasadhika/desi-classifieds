import React from "react";
import { Link } from "react-router-dom";
import { createListingUrl } from "@/utils/slugify";
import { MapPin, Clock, Star, Zap, Shield, Navigation, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatDistance } from "@/utils/geocoder";
import { PRICE_ENABLED_SLUGS } from "@/utils/categoryUtils";

const CATEGORY_LABELS = {
  real_estate: "Real Estate",
  vehicles: "Vehicles",
  jobs: "Jobs",
  services: "Services",
  buy_sell: "Buy & Sell",
  community: "Community",
};

export default function ListingCard({ listing, compact = false, distanceKm }) {
  const image = listing.images?.[0] || null;
  
  const formatPrice = () => {
    if (!listing.price && listing.price !== 0) return "Contact for price";
    if (listing.price === 0) return "Free";
    const formatted = `$${listing.price.toLocaleString()}`;
    if (listing.price_type === "per_month") return `${formatted}/mo`;
    if (listing.price_type === "per_hour") return `${formatted}/hr`;
    return formatted;
  };

  return (
    <Link
      to={createListingUrl(listing)}
      className="listing-card group block bg-white rounded-2xl border border-gray-100 overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-300 select-none">
            <ImageOff className="w-10 h-10 mb-1.5" strokeWidth={1.5} />
            <span className="text-xs font-medium tracking-wide">No photo</span>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {listing.is_featured && (
            <Badge className="bg-[#D80621] text-white text-[10px] font-semibold px-2 py-0.5 badge-featured">
              <Star className="w-3 h-3 mr-1" /> Featured
            </Badge>
          )}
          {listing.is_urgent && (
            <Badge className="bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5">
              <Zap className="w-3 h-3 mr-1" /> Urgent
            </Badge>
          )}
          {listing.is_verified && (
            <Badge className="bg-emerald-500 text-white text-[10px] font-semibold px-2 py-0.5">
              <Shield className="w-3 h-3 mr-1" /> Verified
            </Badge>
          )}
        </div>
        {/* Category pill */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1 rounded-full">
            {CATEGORY_LABELS[listing.category] || listing.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-[#1A1A1A] text-sm leading-snug line-clamp-2 group-hover:text-[#D80621] transition-colors">
            {listing.title}
          </h3>
        </div>

        {PRICE_ENABLED_SLUGS.has(listing.category) && (
          <p className="text-[#D80621] font-bold text-lg mb-2">{formatPrice()}</p>
        )}

        {!compact && (
          <p className="text-gray-500 text-xs line-clamp-2 mb-3">{listing.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {listing.city}, {listing.province}
          </span>
          {distanceKm !== undefined && distanceKm !== null ? (
            <span className="flex items-center gap-1 text-blue-500 font-medium">
              <Navigation className="w-3 h-3" />
              {formatDistance(distanceKm)}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {listing.created_date ? format(new Date(listing.created_date), "MMM d") : "New"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}