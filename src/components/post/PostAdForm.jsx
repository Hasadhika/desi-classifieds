import React, { useState, useEffect } from "react";
import { listingsApi } from "@/api/listingsApi";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { X, Plus, Loader2, MapPin, CheckCircle, Phone, MessageCircle, MessageSquare, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { categoriesApi } from "@/api/categoriesApi";
import DynamicField from "@/components/shared/DynamicField";
import {
  CANADIAN_PROVINCES,
  MAJOR_CITIES,
  validatePostalCode,
  formatPostalCodeForCountry,
  getPostalCodePlaceholder,
  getPostalCodeLabel,
  getPostalCodeMaxLength,
  guessCountryFromPostalCode,
} from "@/utils/locationUtils";
import { getBestCoordinates } from "@/utils/geocoder";
import { addWatermarkToImage } from "@/utils/watermark";
import PayToPostGate from "@/components/shared/PayToPostGate";
import { PRICE_ENABLED_SLUGS } from "@/utils/categoryUtils";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import { reverseGeocode } from "@/utils/googleMapsLoader";
import { generateListingSlug } from "@/utils/slugify";

const ICON_MAP = {
  real_estate: "🏠",
  vehicles: "🚗",
  jobs: "💼",
  services: "🛠",
  buy_sell: "🛒",
  community: "🎉",
};

const CONTACT_PREF_OPTIONS = [
  { value: "all", label: "All Methods" },
  { value: "phone", label: "Phone Only" },
  { value: "whatsapp", label: "WhatsApp Only" },
  { value: "chat", label: "In-App Chat Only" },
  { value: "phone_whatsapp", label: "Phone & WhatsApp" },
  { value: "phone_chat", label: "Phone & Chat" },
  { value: "whatsapp_chat", label: "WhatsApp & Chat" },
];

function showPhone(pref) {
  return !pref || pref === "all" || pref === "phone" || pref === "phone_whatsapp" || pref === "phone_chat";
}

function showWhatsApp(pref) {
  return !pref || pref === "all" || pref === "whatsapp" || pref === "phone_whatsapp" || pref === "whatsapp_chat";
}

function showChat(pref) {
  return !pref || pref === "all" || pref === "chat" || pref === "phone_chat" || pref === "whatsapp_chat";
}

export default function PostAdForm() {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [customFields, setCustomFields] = useState({});
  const [geocoding, setGeocoding] = useState(false);
  const [geoResult, setGeoResult] = useState(null);
  const [placeCoords, setPlaceCoords] = useState(null); // exact coords from Google Places / GPS
  const [detectedCountry, setDetectedCountry] = useState('CA'); // ISO 3166-1 alpha-2
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showPayGate, setShowPayGate] = useState(false);
  const { user: currentUser } = useAuth();

  const { data: categories = [] } = useQuery({
    queryKey: ["parentCategories"],
    queryFn: () => categoriesApi.getParentCategories(),
  });

  const { data: settings = {} } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("key,value");
      const map = {};
      (data || []).forEach(s => { map[s.key] = s.value; });
      return map;
    },
  });

  const freeLimit = parseInt(settings.free_ads_limit || "4");
  const postAdPrice = settings.post_ad_price || "4.99";

  const { data: userAdCount = 0 } = useQuery({
    queryKey: ["user-ad-count", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return 0;
      const { count } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("poster_email", currentUser.email);
      return count || 0;
    },
    enabled: !!currentUser?.email,
  });

  const [form, setForm] = useState({
    title: "", description: "", category: "", subcategory: "",
    price: "", price_type: "fixed", province: "", city: "", postal_code: "",
    contact_phone: "", contact_whatsapp: "", contact_preference: "all",
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories", form.category],
    queryFn: () => categoriesApi.getSubcategoriesByParent(form.category),
    enabled: !!form.category,
  });

  const { data: categoryFields = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ["categoryFields", form.category],
    queryFn: () => categoriesApi.getCategoryFieldsByParentSlug(form.category),
    enabled: !!form.category,
  });

  useEffect(() => {
    setCustomFields({});
  }, [form.category]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const updateCustomField = (fieldName, value) => {
    setCustomFields(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        let processedFile = file;
        try {
          processedFile = await addWatermarkToImage(file);
        } catch {
          processedFile = file;
        }

        const fileExt = "jpg";
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${currentUser?.id}/${fileName}`;

        const { error } = await supabase.storage
          .from('listing-images')
          .upload(filePath, processedFile);

        if (error) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(filePath);

        setImages(prev => [...prev, publicUrl]);
      }
    } catch (error) {
      toast.error("Error uploading images");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const doPost = async () => {
    setGeocoding(true);
    let latitude = null;
    let longitude = null;
    let location_source = null;

    try {
      if (placeCoords) {
        // Use exact coords from Google Places Autocomplete or GPS — most accurate
        latitude = placeCoords.lat;
        longitude = placeCoords.lng;
        location_source = placeCoords.source;
      } else {
        // Fall back to OSM Nominatim geocoding from postal code / city
        const coords = await getBestCoordinates(form.postal_code, form.city, form.province);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
          location_source = coords.source;
        }
      }
    } catch {
    } finally {
      setGeocoding(false);
    }

    const hasPricing = PRICE_ENABLED_SLUGS.has(form.category);
    const data = {
      ...form,
      price: hasPricing && form.price ? parseFloat(form.price) : null,
      price_type: hasPricing ? form.price_type : null,
      images,
      poster_name: currentUser?.user_metadata?.full_name || "",
      poster_email: currentUser?.email || "",
      created_by: currentUser?.email || "",
      status: "pending",
      latitude,
      longitude,
      location_source,
    };
    const listing = await listingsApi.create(data);

    if (listing?.id) {
      // Generate and persist SEO slug immediately after getting the UUID
      const slug = generateListingSlug(listing.title || data.title, listing.id);
      await supabase.from('listings').update({ slug }).eq('id', listing.id);
      listing.slug = slug;
    }

    if (Object.keys(customFields).length > 0 && listing.id) {
      await categoriesApi.saveListingCustomFields(listing.id, customFields);
    }

    return listing;
  };

  const submitMutation = useMutation({
    mutationFn: doPost,
    onSuccess: () => {
      toast.success("Ad submitted for review!", {
        description: "Your listing will be visible to buyers once approved by our team.",
        duration: 5000,
      });
      navigate(createPageUrl("MyAds"));
    },
    onError: () => {
      toast.error("Failed to post ad. Please try again.");
    },
  });

  const handleSubmitClick = () => {
    if (!form.title || !form.description || !form.category || !form.province || !form.city) return;
    if (currentUser?.role !== "admin" && userAdCount >= freeLimit) {
      setShowPayGate(true);
      return;
    }
    submitMutation.mutate();
  };

  const handlePayAndPost = () => {
    setShowPayGate(false);
    toast.info("Payment integration coming soon! Posting your ad now.");
    submitMutation.mutate();
  };

  const cities = MAJOR_CITIES[form.province] || [];

  const handlePostalCodeChange = (value) => {
    // Auto-detect country from the typed pattern when GPS/autocomplete hasn't
    // set it yet. Only switches for unambiguous, fully-entered formats
    // (UK: TF4 3GZ, NL: 1234 AB, CA: M5V 2T6, etc.).
    const guessed = guessCountryFromPostalCode(value);
    const country = guessed || detectedCountry;
    if (guessed && guessed !== detectedCountry) setDetectedCountry(guessed);
    update("postal_code", formatPostalCodeForCountry(value, country));
  };

  /** Called when the user picks a place from Google Places Autocomplete */
  const handlePlaceSelect = ({ city, province, postalCode, countryCode, lat, lng }) => {
    if (city) update("city", city);
    if (province) update("province", province);
    // Format postal code using the detected country's canonical formatter
    if (postalCode) {
      const country = countryCode || detectedCountry || 'CA';
      update("postal_code", formatPostalCodeForCountry(postalCode, country));
    }
    if (countryCode) setDetectedCountry(countryCode);
    if (lat && lng) setPlaceCoords({ lat, lng, source: 'google_places' });
    setGeoResult(null);
  };

  /** Use browser GPS + Google reverse-geocoding to fill in the address */
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPlaceCoords({ lat, lng, source: 'browser_gps' });
        const result = await reverseGeocode(lat, lng);
        if (result) {
          const country = result.countryCode || 'CA';
          if (result.countryCode) setDetectedCountry(result.countryCode);
          if (result.city) update("city", result.city);
          if (result.province) update("province", result.province);
          if (result.postalCode) update("postal_code", formatPostalCodeForCountry(result.postalCode, country));
          toast.success("Location detected!");
        } else {
          toast.info("Location pinned — please confirm city and province.");
        }
        setGpsLoading(false);
      },
      () => {
        toast.error("Could not get your location. Please allow location access.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const pref = form.contact_preference;

  const adsRemaining = Math.max(0, freeLimit - userAdCount);
  const isOverLimit = userAdCount >= freeLimit;

  const showPriceFields = !form.category || PRICE_ENABLED_SLUGS.has(form.category);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PayToPostGate
        open={showPayGate}
        onClose={() => setShowPayGate(false)}
        price={postAdPrice}
        freeLimit={freeLimit}
        onProceedWithPayment={handlePayAndPost}
      />

      {/* Free ads counter */}
      {!isOverLimit ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-green-100 shrink-0">
            <span className="text-base font-bold text-green-700">{adsRemaining}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">
              {adsRemaining} free {adsRemaining === 1 ? "ad" : "ads"} remaining
            </p>
            <p className="text-xs text-green-600">
              You've used {userAdCount} of your {freeLimit} free posts
            </p>
          </div>
          <div className="ml-auto flex gap-1">
            {Array.from({ length: freeLimit }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${i < userAdCount ? "bg-green-400" : "bg-green-200"}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 shrink-0">
            <span className="text-base font-bold text-amber-700">0</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Free ad limit reached</p>
            <p className="text-xs text-amber-600">
              Additional ads cost ${postAdPrice} each
            </p>
          </div>
        </div>
      )}

      {/* Category */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-[#1A1A1A] mb-4">Category</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => { update("category", cat.slug); update("subcategory", ""); }}
              className={`p-3 rounded-xl border text-sm font-medium text-left transition-all flex items-center gap-2 ${
                form.category === cat.slug
                  ? "border-[#D80621] bg-red-50 text-[#D80621]"
                  : "border-gray-200 hover:border-gray-300 text-gray-700"
              }`}
            >
              {cat.icon_url ? (
                <img src={cat.icon_url} alt={cat.label} className="w-5 h-5 rounded object-cover shrink-0" />
              ) : (
                <span>{ICON_MAP[cat.slug] || ""}</span>
              )}
              {cat.label}
            </button>
          ))}
        </div>
        {subcategories.length > 0 && (
          <div className="mt-4">
            <Label className="text-xs text-gray-500 uppercase tracking-wider">Subcategory</Label>
            <Select value={form.subcategory} onValueChange={(v) => update("subcategory", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {subcategories.map(s => <SelectItem key={s.slug} value={s.label}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-[#1A1A1A]">Ad Details</h3>
        <div>
          <Label>Title *</Label>
          <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Spacious basement room in Brampton" className="mt-1.5" />
        </div>
        <div>
          <Label>Description *</Label>
          <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe your ad in detail..." className="mt-1.5 min-h-[120px]" />
        </div>
        {showPriceFields && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Price (CAD)</Label>
              <Input type="number" value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="0" className="mt-1.5" />
            </div>
            <div>
              <Label>Price Type</Label>
              <Select value={form.price_type} onValueChange={(v) => update("price_type", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="negotiable">Negotiable</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="per_month">Per Month</SelectItem>
                  <SelectItem value="per_hour">Per Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Category Fields */}
      {form.category && categoryFields.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-semibold text-[#1A1A1A]">Additional Details</h3>
          {fieldsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryFields.map(field => (
                <div key={field.slug} className={field.field_type === 'textarea' ? 'md:col-span-2' : ''}>
                  <DynamicField field={field} value={customFields[field.slug]} onChange={updateCustomField} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Images */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#1A1A1A]">Photos <span className="text-gray-400 font-normal text-sm">({images.length}/10)</span></h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">Verified by DC watermark added</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {images.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          {images.length < 10 && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-[#D80621] flex flex-col items-center justify-center cursor-pointer transition-colors">
              {uploading ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <Plus className="w-5 h-5 text-gray-400" />}
              <span className="text-[10px] text-gray-400 mt-1">Add Photo</span>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#D80621]" />
            <h3 className="font-semibold text-[#1A1A1A]">Location</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseCurrentLocation}
            disabled={gpsLoading}
            className="gap-1.5 h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
            Use Current Location
          </Button>
        </div>
        <p className="text-xs text-gray-500 -mt-2">Your ad's location helps buyers find listings near them.</p>

        {/* Google Places Autocomplete */}
        <div>
          <Label>Search Location</Label>
          <div className="mt-1.5">
            <AddressAutocomplete
              placeholder="Search city, area or postal code…"
              onPlaceSelect={handlePlaceSelect}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Selecting a location auto-fills the fields below</p>
        </div>

        {placeCoords && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            Exact location pinned — your ad will appear in "Near Me" searches
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Province *</Label>
            <Select value={form.province} onValueChange={(v) => { update("province", v); update("city", ""); setGeoResult(null); }}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{CANADIAN_PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>City *</Label>
            <Input
              value={form.city}
              onChange={(e) => { update("city", e.target.value); setGeoResult(null); }}
              placeholder={cities.length > 0 ? `e.g. ${cities[0]}` : "City name"}
              className="mt-1.5"
              list="city-suggestions"
            />
            {cities.length > 0 && (
              <datalist id="city-suggestions">
                {cities.map(c => <option key={c} value={c} />)}
              </datalist>
            )}
          </div>
        </div>
        <div>
          <Label>
            {getPostalCodeLabel(detectedCountry)}
            {' '}
            <span className="text-gray-400 text-xs">(Recommended — improves location accuracy)</span>
          </Label>
          <Input
            value={form.postal_code}
            onChange={(e) => { handlePostalCodeChange(e.target.value); setGeoResult(null); }}
            placeholder={getPostalCodePlaceholder(detectedCountry)}
            maxLength={getPostalCodeMaxLength(detectedCountry)}
            className="mt-1.5 uppercase"
          />
          {form.postal_code && (() => {
            const v = validatePostalCode(form.postal_code, detectedCountry);
            return !v.valid ? (
              <p className="text-xs text-red-500 mt-1">{v.message}</p>
            ) : null;
          })()}
        </div>
        {geocoding && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" /> Pinpointing location on map...
          </div>
        )}
        {geoResult && (
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <CheckCircle className="w-3 h-3" /> Location pinned successfully
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-[#1A1A1A]">Contact Details</h3>
        <div>
          <Label>How buyers can reach you</Label>
          <Select value={form.contact_preference} onValueChange={(v) => update("contact_preference", v)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTACT_PREF_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400 mt-1.5">Only the selected contact methods will be shown to buyers.</p>
        </div>

        <div className="space-y-4">
          {showPhone(pref) && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <Phone className="w-4 h-4 text-gray-500 mt-2.5 shrink-0" />
              <div className="flex-1">
                <Label>Phone Number</Label>
                <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} placeholder="+1 xxx xxx xxxx" className="mt-1.5 bg-white" />
              </div>
            </div>
          )}

          {showWhatsApp(pref) && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <MessageCircle className="w-4 h-4 text-green-600 mt-2.5 shrink-0" />
              <div className="flex-1">
                <Label>WhatsApp Number</Label>
                <Input value={form.contact_whatsapp} onChange={(e) => update("contact_whatsapp", e.target.value)} placeholder="+1 xxx xxx xxxx" className="mt-1.5 bg-white" />
              </div>
            </div>
          )}

          {showChat(pref) && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <MessageSquare className="w-4 h-4 text-[#D80621] shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">In-App Chat</p>
                <p className="text-xs text-gray-400">Buyers can message you directly through DesiClassifieds</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Free ads counter */}
      {currentUser?.role !== "admin" && (
        <div className={`rounded-xl p-3 flex items-center gap-3 text-sm ${userAdCount >= freeLimit ? "bg-amber-50 border border-amber-100" : "bg-gray-50 border border-gray-100"}`}>
          <div className={`w-2 h-2 rounded-full shrink-0 ${userAdCount >= freeLimit ? "bg-amber-400" : "bg-green-400"}`} />
          {userAdCount >= freeLimit ? (
            <span className="text-amber-700">You've used all {freeLimit} free ads. The next ad costs <strong>${postAdPrice}</strong>.</span>
          ) : (
            <span className="text-gray-600">{freeLimit - userAdCount} free ad{freeLimit - userAdCount !== 1 ? "s" : ""} remaining (out of {freeLimit}).</span>
          )}
        </div>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmitClick}
        disabled={!form.title || !form.description || !form.category || !form.province || !form.city || submitMutation.isPending}
        className="w-full h-12 rounded-xl bg-[#D80621] hover:bg-[#B00520] text-white font-semibold text-base"
      >
        {submitMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
        {geocoding ? "Pinpointing Location..." : submitMutation.isPending ? "Posting..." : "Post Ad"}
      </Button>
    </div>
  );
}
