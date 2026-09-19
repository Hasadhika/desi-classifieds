import React, { useState, useEffect, useCallback } from "react";
import { listingsApi, savedListingsApi } from "@/api/listingsApi";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSEO } from "@/hooks/useSEO";
import { createListingUrl } from "@/utils/slugify";
import { format } from "date-fns";
import {
  MapPin, Clock, Phone, MessageCircle, Share2, Heart, Flag,
  ChevronLeft, ChevronRight, Shield, Star, Zap, Eye, Calendar,
  Navigation, TrendingUp, CheckCircle2, Copy, Check, X, ZoomIn, RotateCcw,
  ChevronDown, ChevronUp
} from "lucide-react";
import { useUserLocation } from "@/hooks/useUserLocation";
import { calculateDistance } from "@/utils/locationUtils";
import { formatDistance } from "@/utils/geocoder";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { categoriesApi } from "@/api/categoriesApi";
import ShareModal from "@/components/shared/ShareModal";
import PromoteListingModal from "@/components/shared/PromoteListingModal";
import BrowseRestrictionWall, { useBrowseRestriction } from "@/components/shared/BrowseRestrictionWall";

import { PRICE_ENABLED_SLUGS } from "@/utils/categoryUtils";
import ListingMapView from "@/components/shared/ListingMapView";

const CATEGORY_LABELS = {
  real_estate: "Real Estate", vehicles: "Vehicles", jobs: "Jobs",
  services: "Services", buy_sell: "Buy & Sell", community: "Community",
};

function ImageLightbox({ images, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);

  const prev = useCallback(() => setIndex(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIndex(i => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prev, next, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        onClick={onClose}
      >
        <X className="w-8 h-8" />
      </button>

      <div className="relative max-w-5xl max-h-[90vh] w-full px-16" onClick={e => e.stopPropagation()}>
        <img
          src={images[index]}
          alt=""
          className="max-h-[85vh] max-w-full mx-auto object-contain rounded-lg select-none"
          draggable={false}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <div className="absolute bottom-[-2rem] left-1/2 -translate-x-1/2 text-white/50 text-sm">
          {index + 1} / {images.length}
        </div>
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIndex(i); }}
              className={`w-2 h-2 rounded-full transition-all ${i === index ? "bg-white w-6" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListingDetail() {
  // Support both:
  //   Legacy URL:  /ListingDetail?id={uuid}
  //   Slug URL:    /{catSlug}/{provSlug}/{titleSlug}  (titleSlug ends with 8-char short id)
  const { titleSlug } = useParams();
  const urlParams = new URLSearchParams(window.location.search);
  const directId = urlParams.get("id");

  // When arriving via slug URL, look up by slug first; fall back to ?id= param
  const isSlugRoute = !!titleSlug;

  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { isBlocked } = useBrowseRestriction(isAuthenticated);
  const { location: userLocation } = useUserLocation();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", titleSlug || directId],
    queryFn: () =>
      isSlugRoute
        ? listingsApi.getBySlug(titleSlug)
        : listingsApi.getById(directId),
    enabled: !!(titleSlug || directId),
  });

  // Resolved listing ID (used by mutations and sub-queries)
  const id = listing?.id || directId;

  // SEO meta tags — set once listing is loaded
  const listingTitle = listing
    ? `${listing.title} – ${listing.city}, ${listing.province} | DesiClassifieds`
    : 'Listing – DesiClassifieds';
  const listingDesc = listing?.description
    ? listing.description.slice(0, 160)
    : 'Find great deals on DesiClassifieds — Canada\'s South Asian community marketplace.';
  const canonicalUrl = listing
    ? `${window.location.origin}${createListingUrl(listing)}`
    : undefined;

  useSEO({
    title: listingTitle,
    description: listingDesc,
    canonicalUrl,
    ogImage: listing?.images?.[0],
  });

  const { data: customFields = {} } = useQuery({
    queryKey: ["listingCustomFields", id],
    queryFn: () => categoriesApi.getListingCustomFields(id),
    enabled: !!id,
  });

  const { data: savedListings = [] } = useQuery({
    queryKey: ["saved", currentUser?.email],
    queryFn: () => savedListingsApi.filter({ user_email: currentUser.email }),
    enabled: !!currentUser?.email,
  });

  const { data: posterProfile } = useQuery({
    queryKey: ["posterProfile", listing?.poster_email],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', listing.poster_email)
        .maybeSingle();
      return data;
    },
    enabled: !!listing?.poster_email,
  });

  const { data: platformSettings = {} } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("key,value");
      const map = {};
      (data || []).forEach(s => { map[s.key] = s.value; });
      return map;
    },
  });

  const { data: posterListingCount = 0 } = useQuery({
    queryKey: ["posterListingCount", listing?.poster_email],
    queryFn: async () => {
      const { count } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('poster_email', listing.poster_email)
        .eq('status', 'active');
      return count || 0;
    },
    enabled: !!listing?.poster_email,
  });

  const isSaved = savedListings.some(s => s.listing_id === id);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await savedListingsApi.deleteByListingAndUser(id, currentUser.email);
      } else {
        await savedListingsApi.create({ listing_id: id, user_email: currentUser.email });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved"] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id: listingId, status }) => {
      const { data, error } = await supabase.rpc('update_listing_status', {
        p_listing_id: listingId,
        p_new_status: status,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["listing", id] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listings-recent"] });
      queryClient.invalidateQueries({ queryKey: ["listings-featured"] });
      queryClient.invalidateQueries({ queryKey: ["listings-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["listings-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["browse-listings"] });
      toast.success(status === "sold" ? "Marked as sold — removed from homepage" : "Listing reactivated");
    },
    onError: () => toast.error("Failed to update status. Please try again."),
  });

  const reportMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('reports').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Report submitted. Thank you!"),
    onError: () => toast.error("Failed to submit report. Please try again."),
  });

  useEffect(() => {
    if (listing && id) {
      listingsApi.incrementViews(id).catch(() => {});
      // Track viewed categories for "Based on your interests"
      if (listing.category) {
        try {
          const tracked = JSON.parse(localStorage.getItem("dc_viewed_categories") || "[]");
          const updated = [listing.category, ...tracked.filter(c => c !== listing.category)].slice(0, 5);
          localStorage.setItem("dc_viewed_categories", JSON.stringify(updated));
        } catch {}
      }
    }
  }, [id, listing?.id]);

  const handleCopyPhone = () => {
    const phone = listing?.contact_phone;
    if (!phone) return;
    navigator.clipboard.writeText(phone).then(() => {
      setPhoneCopied(true);
      toast.success("Phone number copied!");
      setTimeout(() => setPhoneCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-video rounded-2xl" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Listing not found</h2>
        <Link to={createPageUrl("Browse")} className="text-[#D80621] mt-2 inline-block">Back to listings</Link>
      </div>
    );
  }

  const images = listing.images?.length ? listing.images : [
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop"
  ];

  const isSold = listing.status === "sold";
  const isOwner = currentUser && listing?.poster_email === currentUser.email;

  const distanceKm = userLocation && listing.latitude && listing.longitude
    ? calculateDistance(userLocation.lat, userLocation.lng, listing.latitude, listing.longitude)
    : null;

  const formatPrice = () => {
    if (!listing.price && listing.price !== 0) return "Contact for price";
    if (listing.price === 0) return "Free";
    const f = `$${listing.price.toLocaleString()}`;
    if (listing.price_type === "per_month") return `${f}/month`;
    if (listing.price_type === "per_hour") return `${f}/hour`;
    if (listing.price_type === "negotiable") return `${f} (Negotiable)`;
    return f;
  };

  return (
    <div className="page-enter min-h-screen bg-[#F8F8F8]">
      {isBlocked && <BrowseRestrictionWall />}
      {lightboxOpen && (
        <ImageLightbox
          images={images}
          initialIndex={currentImage}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to={createPageUrl("Home")} className="hover:text-[#D80621]">Home</Link>
          <span>/</span>
          <Link to={createPageUrl("Browse") + `?category=${listing.category}`} className="hover:text-[#D80621]">
            {CATEGORY_LABELS[listing.category]}
          </Link>
          <span>/</span>
          <span className="text-[#1A1A1A] truncate max-w-[200px]">{listing.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Image Gallery */}
            <div className="relative bg-white rounded-2xl overflow-hidden border border-gray-100">
              <div className="aspect-video relative group">
                <img
                  src={images[currentImage]}
                  alt={listing.title}
                  className={`w-full h-full object-cover cursor-zoom-in transition-opacity ${isSold ? "opacity-60" : ""}`}
                  onClick={() => setLightboxOpen(true)}
                />

                {isSold && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/60 text-white font-bold text-2xl px-8 py-3 rounded-2xl tracking-widest uppercase rotate-[-12deg] select-none">
                      SOLD
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setLightboxOpen(true)}
                  className="absolute top-3 right-3 w-9 h-9 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImage(i => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentImage(i => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImage(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === currentImage ? "bg-white w-6" : "bg-white/50"}`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Status + feature badges */}
                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                  {listing.is_featured && <Badge className="bg-[#D80621] text-white text-xs"><Star className="w-3 h-3 mr-1" />Featured</Badge>}
                  {listing.is_urgent && <Badge className="bg-amber-500 text-white text-xs"><Zap className="w-3 h-3 mr-1" />Urgent</Badge>}
                  {listing.is_verified && <Badge className="bg-emerald-500 text-white text-xs"><Shield className="w-3 h-3 mr-1" />Verified</Badge>}
                </div>
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === currentImage ? "border-[#D80621]" : "border-transparent opacity-60 hover:opacity-100"}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-[#1A1A1A] leading-tight">{listing.title}</h1>
                    {isSold && (
                      <Badge className="bg-blue-100 text-blue-700 shrink-0">Sold</Badge>
                    )}
                  </div>
                  <div className="flex items-center flex-wrap gap-3 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{listing.city}, {listing.province}</span>
                    {listing.postal_code && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.postal_code}</span>
                    )}
                    {distanceKm !== null && (
                      <span className="flex items-center gap-1 text-blue-500 font-medium">
                        <Navigation className="w-4 h-4" />
                        {formatDistance(distanceKm)} away
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{listing.created_date ? format(new Date(listing.created_date), "MMM d, yyyy") : "Recently"}</span>
                    <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{listing.views || 0} views</span>
                  </div>
                </div>
                {PRICE_ENABLED_SLUGS.has(listing.category) && listing.price != null && (
                  <p className="text-2xl font-bold text-[#D80621] whitespace-nowrap">{formatPrice()}</p>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-semibold text-[#1A1A1A] mb-2">Description</h3>
                <p className="text-gray-600 whitespace-pre-line leading-relaxed">{listing.description}</p>
              </div>

              {/* View More Details toggle */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <button
                  onClick={() => setShowMoreDetails(v => !v)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-[#1A1A1A] hover:text-[#D80621] transition-colors"
                >
                  <span>View More Details</span>
                  {showMoreDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showMoreDetails && (
                  <div className="mt-4 space-y-5">
                    {/* Core listing details grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {listing.category && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wider">Category</span>
                          <p className="text-sm font-medium mt-0.5">{CATEGORY_LABELS[listing.category] || listing.category}</p>
                        </div>
                      )}
                      {listing.subcategory && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wider">Subcategory</span>
                          <p className="text-sm font-medium mt-0.5">{listing.subcategory}</p>
                        </div>
                      )}
                      {listing.price_type && PRICE_ENABLED_SLUGS.has(listing.category) && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wider">Price Type</span>
                          <p className="text-sm font-medium mt-0.5 capitalize">{listing.price_type.replace(/_/g, " ")}</p>
                        </div>
                      )}
                      {listing.city && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wider">City</span>
                          <p className="text-sm font-medium mt-0.5">{listing.city}</p>
                        </div>
                      )}
                      {listing.province && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wider">Province</span>
                          <p className="text-sm font-medium mt-0.5">{listing.province}</p>
                        </div>
                      )}
                      {listing.postal_code && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wider">Postal Code</span>
                          <p className="text-sm font-medium mt-0.5">{listing.postal_code}</p>
                        </div>
                      )}
                      {listing.contact_preference && listing.contact_preference !== "all" && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wider">Contact Preference</span>
                          <p className="text-sm font-medium mt-0.5 capitalize">{listing.contact_preference.replace(/_/g, " ")}</p>
                        </div>
                      )}
                      {(listing.is_urgent || listing.is_verified || listing.is_featured) && (
                        <div className="col-span-2">
                          <span className="text-xs text-gray-500 uppercase tracking-wider">Tags</span>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {listing.is_urgent && <Badge className="bg-amber-100 text-amber-700 text-xs">Urgent</Badge>}
                            {listing.is_verified && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Verified</Badge>}
                            {listing.is_featured && <Badge className="bg-red-100 text-red-700 text-xs">Featured</Badge>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional (category-specific) custom fields */}
                    {Object.keys(customFields).length > 0 && (
                      <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3">Additional Details</h4>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          {Object.entries(customFields).map(([key, field]) => (
                            <div key={key}>
                              <span className="text-xs text-gray-500 uppercase tracking-wider">{field.label}</span>
                              <p className="text-sm font-medium mt-0.5">{field.value || "N/A"}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Google Map — shows approximate listing location */}
            {listing.latitude && listing.longitude && (
              <ListingMapView
                lat={listing.latitude}
                lng={listing.longitude}
                title={listing.title}
                city={listing.city}
                province={listing.province}
              />
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-5">
            {/* Seller info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <Link
                to={createPageUrl("UserProfile") + `?email=${listing.poster_email || listing.created_by}`}
                className="flex items-center gap-3 mb-4 hover:bg-gray-50 -m-2 p-2 rounded-xl transition-colors"
              >
                <UserAvatar
                  name={listing.poster_name}
                  email={listing.poster_email}
                  className="w-12 h-12 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1A1A1A] truncate">{listing.poster_name || "Member"}</p>
                  <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Member since {posterProfile?.created_date
                        ? format(new Date(posterProfile.created_date), "MMM d, yyyy")
                        : listing?.created_date
                          ? format(new Date(listing.created_date), "MMM yyyy")
                          : "Recently"}
                    </span>
                    <span>{posterListingCount} active listing{posterListingCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </Link>

              <div className="space-y-2.5">
                {listing.contact_phone && listing.contact_preference !== "whatsapp" && listing.contact_preference !== "chat" && listing.contact_preference !== "whatsapp_chat" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-11 rounded-xl font-medium"
                      onClick={() => setShowPhone(!showPhone)}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      {showPhone ? listing.contact_phone : "Show Phone Number"}
                    </Button>
                    {showPhone && (
                      <Button
                        variant="outline"
                        className="h-11 w-11 rounded-xl shrink-0"
                        onClick={handleCopyPhone}
                        title="Copy phone number"
                      >
                        {phoneCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                )}
                {listing.contact_whatsapp && listing.contact_preference !== "phone" && listing.contact_preference !== "chat" && listing.contact_preference !== "phone_chat" && (
                  <a href={`https://wa.me/${listing.contact_whatsapp.replace(/\D/g, "")}`} target="_blank\" rel="noopener noreferrer">
                    <Button className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium">
                      <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                    </Button>
                  </a>
                )}
                {listing.contact_preference !== "phone" && listing.contact_preference !== "whatsapp" && listing.contact_preference !== "phone_whatsapp" && (
                  <Link to={createPageUrl("Messages") + `?listing=${id}&to=${listing.poster_email || listing.created_by}`}>
                    <Button className="w-full h-11 rounded-xl bg-[#D80621] hover:bg-[#B00520] text-white font-medium mt-1">
                      <MessageCircle className="w-4 h-4 mr-2" /> Send Message
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2.5">
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl text-sm"
                onClick={() => { if (currentUser) saveMutation.mutate(); }}
              >
                <Heart className={`w-4 h-4 mr-2 ${isSaved ? "fill-[#D80621] text-[#D80621]" : ""}`} />
                {isSaved ? "Saved" : "Save Listing"}
              </Button>
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl text-sm"
                onClick={() => setShowShareModal(true)}
              >
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>

              {isOwner && !listing?.is_featured && listing?.status === "active" && (
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl text-sm border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => setShowPromoteModal(true)}
                >
                  <TrendingUp className="w-4 h-4 mr-2" /> Promote on Homepage
                </Button>
              )}

              {isOwner && listing?.status === "active" && (
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl text-sm border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => updateStatusMutation.mutate({ id, status: "sold" })}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {updateStatusMutation.isPending ? "Updating..." : "Switch to Sold"}
                </Button>
              )}

              {isOwner && listing?.status === "sold" && (
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl text-sm border-green-200 text-green-700 hover:bg-green-50"
                  onClick={() => updateStatusMutation.mutate({ id, status: "active" })}
                  disabled={updateStatusMutation.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {updateStatusMutation.isPending ? "Updating..." : "Reactivate Listing"}
                </Button>
              )}

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-full h-10 rounded-xl text-sm text-gray-500">
                    <Flag className="w-4 h-4 mr-2" /> Report
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Report this listing</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Select value={reportReason} onValueChange={setReportReason}>
                      <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spam">Spam</SelectItem>
                        <SelectItem value="scam">Scam / Fraud</SelectItem>
                        <SelectItem value="inappropriate">Inappropriate</SelectItem>
                        <SelectItem value="duplicate">Duplicate</SelectItem>
                        <SelectItem value="wrong_category">Wrong Category</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea placeholder="Additional details..." value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} />
                    <Button
                      className="w-full bg-[#D80621] hover:bg-[#B00520]"
                      onClick={() => {
                        if (reportReason && currentUser) {
                          reportMutation.mutate({ listing_id: id, reporter_email: currentUser.email, reason: reportReason, details: reportDetails });
                        }
                      }}
                    >
                      Submit Report
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Safety tips */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <h4 className="font-semibold text-amber-800 text-sm mb-1">Safety Tips</h4>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>• Meet in a public place</li>
                <li>• Never send money in advance</li>
                <li>• Inspect the item before paying</li>
                <li>• Trust your instincts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={window.location.href}
        title={listing?.title || "Check out this listing"}
      />

      {listing && (
        <PromoteListingModal
          open={showPromoteModal}
          onClose={() => setShowPromoteModal(false)}
          listing={listing}
          price={platformSettings.promotion_price || "9.99"}
          durationDays={platformSettings.promotion_duration_days || "7"}
          userEmail={currentUser?.email}
        />
      )}
    </div>
  );
}
