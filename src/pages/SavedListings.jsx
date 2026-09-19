import React from "react";
import { savedListingsApi } from "@/api/listingsApi";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ListingCard from "../components/shared/ListingCard";

export default function SavedListings() {
  const { user: currentUser } = useAuth();

  const { data: savedItems = [], isLoading } = useQuery({
    queryKey: ["saved", currentUser?.email],
    queryFn: () => savedListingsApi.filter({ user_email: currentUser.email }),
    enabled: !!currentUser?.email,
  });

  const savedListings = savedItems.map(item => item.listings).filter(Boolean);

  return (
    <div className="page-enter min-h-screen bg-[#F8F8F8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-8">Saved Listings</h1>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        ) : savedListings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="font-semibold text-lg">No saved listings yet</h3>
            <p className="text-gray-500 mt-1 text-sm">Save listings you like to find them easily later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}