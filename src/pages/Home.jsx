import React, { useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Megaphone } from "lucide-react";
import HeroSection from "../components/home/HeroSection";
import EventsMarquee from "../components/home/EventsMarquee";
import CategoryGrid from "../components/home/CategoryGrid";
import StatsBar from "../components/home/StatsBar";
import ListingSection from "../components/home/ListingSection";
import NearYouSection from "../components/home/NearYouSection";
import CTABanner from "../components/home/CTABanner";
import PromotedContentSection from "../components/home/PromotedContentSection";
import BrowseRestrictionWall, { useBrowseRestriction } from "@/components/shared/BrowseRestrictionWall";

async function fetchListings({ category, isFeatured, limit = 8 }) {
  let query = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_date', { ascending: false })
    .limit(limit);

  if (category)   query = query.eq('category', category);
  if (isFeatured) query = query.eq('is_featured', true);

  const { data, error } = await query;
  if (error) {
    console.error('[Home fetchListings] error:', error, { category, isFeatured });
    return [];
  }
  return data || [];
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { isBlocked } = useBrowseRestriction(isAuthenticated);

  const viewedCategories = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("dc_viewed_categories") || "[]"); }
    catch { return []; }
  }, []);

  const { data: interestListings = [], isLoading: loadingInterests } = useQuery({
    queryKey: ["listings-interests", viewedCategories],
    queryFn: async () => {
      if (!viewedCategories.length) return [];
      const { data } = await supabase
        .from('listings').select('*').eq('status', 'active')
        .in('category', viewedCategories)
        .order('created_date', { ascending: false }).limit(8);
      return data || [];
    },
    enabled: viewedCategories.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const { data: featuredListings = [], isLoading: loadingFeatured } = useQuery({
    queryKey: ["listings-featured"],
    queryFn: () => fetchListings({ isFeatured: true, limit: 4 }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: recentListings = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["listings-recent"],
    queryFn: () => fetchListings({ limit: 8 }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: jobListings = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["listings-jobs"],
    queryFn: () => fetchListings({ category: "jobs", limit: 4 }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: rentalListings = [], isLoading: loadingRentals } = useQuery({
    queryKey: ["listings-rentals"],
    queryFn: () => fetchListings({ category: "real_estate", limit: 4 }),
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="page-enter bg-white">
      {isBlocked && <BrowseRestrictionWall />}

      {/* 1. Hero — search + quick nav */}
      <HeroSection />

      {/* 1b. Events & Sales marquee ticker */}
      <EventsMarquee />

      {/* 2. Trust / Stats bar */}
      <StatsBar listingCount={recentListings.length > 0 ? `${recentListings.length}+` : "500+"} />

      {/* 3. Category grid */}
      <CategoryGrid />

      {/* 4. Near you (logged-in only) */}
      {user && <NearYouSection />}

      {/* 6. Personalised / interests */}
      {viewedCategories.length > 0 && (
        <div className="bg-[#FAFAFA]">
          <ListingSection
            badge="Recommended for you"
            title="Based on Your Interests"
            subtitle="Listings similar to what you've been browsing"
            listings={interestListings}
            isLoading={loadingInterests}
            accentColor="#7c3aed"
          />
        </div>
      )}

      {/* 7. Featured listings */}
      <ListingSection
        badge="Hand-picked"
        title="Featured Listings"
        subtitle="Top-quality ads promoted by verified sellers"
        listings={featuredListings}
        isLoading={loadingFeatured}
        accentColor="#D80621"
      />

      {/* 8. Newest listings */}
      <div className="bg-[#FAFAFA]">
        <ListingSection
          badge="Just posted"
          title="Newest Listings"
          subtitle="Fresh ads from the community — posted today"
          listings={recentListings}
          isLoading={loadingRecent}
          accentColor="#D80621"
        />
      </div>

      {/* 9. Jobs */}
      <ListingSection
        badge="Opportunities"
        title="Jobs for Newcomers"
        subtitle="IT, trucking, restaurant & survival jobs"
        listings={jobListings}
        isLoading={loadingJobs}
        linkParams="category=jobs"
        accentColor="#ea580c"
      />

      {/* 10. Rentals */}
      <div className="bg-[#FAFAFA]">
        <ListingSection
          badge="Housing"
          title="Rooms &amp; Rentals"
          subtitle="Basements, PG, shared rooms across Canada"
          listings={rentalListings}
          isLoading={loadingRentals}
          linkParams="category=real_estate"
          accentColor="#2563eb"
        />
      </div>

      {/* 11. Big CTA */}
      <CTABanner />

      {/* 12. Advertise strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
        <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1A1A1A]">Advertise with DesiClassifieds</p>
              <p className="text-xs text-gray-500">Reach 10,000+ South Asian community members across Canada</p>
            </div>
          </div>
          <Link
            to={createPageUrl("Advertise")}
            className="shrink-0 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors"
          >
            Promote Now →
          </Link>
        </div>
      </section>

      {/* 13. Promoted content (ads/sponsored) */}
      <PromotedContentSection />
    </div>
  );
}
