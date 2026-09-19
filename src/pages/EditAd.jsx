import React, { useState, useEffect } from "react";
import { listingsApi } from "@/api/listingsApi";
import { categoriesApi } from "@/api/categoriesApi";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { X, Plus, Loader2, MapPin, Phone, MessageCircle, MessageSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import DynamicField from "@/components/shared/DynamicField";
import {
  CANADIAN_PROVINCES,
  MAJOR_CITIES,
  formatPostalCode,
  validatePostalCode,
} from "@/utils/locationUtils";
import { getBestCoordinates } from "@/utils/geocoder";
import { addWatermarkToImage } from "@/utils/watermark";

const MAX_EDITS = 3;

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

export default function EditAd() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [customFields, setCustomFields] = useState({});
  const [geocoding, setGeocoding] = useState(false);
  const [form, setForm] = useState(null);

  const { data: listing, isLoading: listingLoading } = useQuery({
    queryKey: ["listing-edit", id],
    queryFn: () => listingsApi.getById(id),
    enabled: !!id,
  });

  const { data: existingCustomFields = {} } = useQuery({
    queryKey: ["listingCustomFields-edit", id],
    queryFn: () => categoriesApi.getListingCustomFields(id),
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["parentCategories"],
    queryFn: () => categoriesApi.getParentCategories(),
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories", form?.category],
    queryFn: () => categoriesApi.getSubcategoriesByParent(form.category),
    enabled: !!form?.category,
  });

  const { data: categoryFields = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ["categoryFields", form?.category],
    queryFn: () => categoriesApi.getCategoryFieldsByParentSlug(form.category),
    enabled: !!form?.category,
  });

  // Pre-populate form from listing data
  useEffect(() => {
    if (listing && !form) {
      setForm({
        title: listing.title || "",
        description: listing.description || "",
        category: listing.category || "",
        subcategory: listing.subcategory || "",
        price: listing.price != null ? String(listing.price) : "",
        price_type: listing.price_type || "fixed",
        province: listing.province || "",
        city: listing.city || "",
        postal_code: listing.postal_code || "",
        contact_phone: listing.contact_phone || "",
        contact_whatsapp: listing.contact_whatsapp || "",
        contact_preference: listing.contact_preference || "all",
      });
      setImages(listing.images || []);
    }
  }, [listing]);

  // Pre-populate custom fields
  useEffect(() => {
    if (Object.keys(existingCustomFields).length > 0 && Object.keys(customFields).length === 0) {
      const prefilled = {};
      Object.entries(existingCustomFields).forEach(([slug, field]) => {
        prefilled[slug] = field.value;
      });
      setCustomFields(prefilled);
    }
  }, [existingCustomFields]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const updateCustomField = (fieldName, value) => setCustomFields(prev => ({ ...prev, [fieldName]: value }));

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
        try { processedFile = await addWatermarkToImage(file); } catch { processedFile = file; }
        const fileName = `${Math.random()}.jpg`;
        const filePath = `${currentUser?.id}/${fileName}`;
        const { error } = await supabase.storage.from("listing-images").upload(filePath, processedFile);
        if (error) { toast.error(`Failed to upload ${file.name}`); continue; }
        const { data: { publicUrl } } = supabase.storage.from("listing-images").getPublicUrl(filePath);
        setImages(prev => [...prev, publicUrl]);
      }
    } catch {
      toast.error("Error uploading images");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const doUpdate = async () => {
    setGeocoding(true);
    let latitude = listing.latitude;
    let longitude = listing.longitude;
    let location_source = listing.location_source;

    const locationChanged =
      form.postal_code !== listing.postal_code ||
      form.city !== listing.city ||
      form.province !== listing.province;

    if (locationChanged) {
      try {
        const coords = await getBestCoordinates(form.postal_code, form.city, form.province);
        if (coords) { latitude = coords.lat; longitude = coords.lng; location_source = coords.source; }
      } catch { /* keep existing */ }
    }
    setGeocoding(false);

    // Use SECURITY DEFINER RPC — same pattern as update_listing_status which bypasses JWT email issue
    const { error } = await supabase.rpc("update_listing_content", {
      p_listing_id:         id,
      p_title:              form.title,
      p_description:        form.description,
      p_price:              form.price ? parseFloat(form.price) : null,
      p_price_type:         form.price_type,
      p_subcategory:        form.subcategory || "",
      p_province:           form.province,
      p_city:               form.city,
      p_postal_code:        form.postal_code || "",
      p_contact_phone:      form.contact_phone || "",
      p_contact_whatsapp:   form.contact_whatsapp || "",
      p_contact_preference: form.contact_preference,
      p_images:             images,
      p_latitude:           latitude,
      p_longitude:          longitude,
      p_location_source:    location_source,
    });

    if (error) {
      console.error("[EditAd] update_listing_content RPC failed:", error);
      throw new Error(error.message || "Update failed");
    }

    // Increment edit_count — silent if column missing
    await supabase
      .from("listings")
      .update({ edit_count: (listing.edit_count || 0) + 1 })
      .eq("id", id);

    // Update custom fields — non-blocking
    try {
      await categoriesApi.updateListingCustomFields(id, customFields);
    } catch (cfErr) {
      console.warn("[EditAd] custom fields update failed (non-blocking):", cfErr);
    }

    return true;
  };

  const submitMutation = useMutation({
    mutationFn: doUpdate,
    onSuccess: () => {
      toast.success("Ad updated and resubmitted for review!", {
        description: "Admin will review your updated listing.",
        duration: 4000,
      });
      navigate(createPageUrl("MyAds"));
    },
    onError: (err) => {
      console.error("[EditAd] update failed:", err);
      const msg = err?.message || err?.error_description || JSON.stringify(err);
      toast.error(`Update failed: ${msg}`, { duration: 8000 });
    },
  });

  if (listingLoading || !form) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Access control
  if (!currentUser || listing?.poster_email !== currentUser.email) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">You don't have permission to edit this ad.</p>
      </div>
    );
  }

  const editCount = listing?.edit_count || 0;
  const editsLeft = MAX_EDITS - editCount;

  if (listing?.status !== "pending") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-semibold">Editing not available</h2>
        <p className="text-gray-500 text-sm">
          You can only edit an ad while it is pending admin approval.
          {listing?.status === "active" && " This ad is already live."}
          {listing?.status === "rejected" && " This ad has been rejected. Please contact support."}
        </p>
        <Button variant="outline" onClick={() => navigate(createPageUrl("MyAds"))}>Back to My Ads</Button>
      </div>
    );
  }

  if (editsLeft <= 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-semibold">Edit limit reached</h2>
        <p className="text-gray-500 text-sm">You have used all {MAX_EDITS} allowed edits for this ad.</p>
        <Button variant="outline" onClick={() => navigate(createPageUrl("MyAds"))}>Back to My Ads</Button>
      </div>
    );
  }

  const pref = form.contact_preference;
  const cities = MAJOR_CITIES[form.province] || [];

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Edit Ad</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("MyAds"))}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
        </div>

        {/* Edit counter */}
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${editsLeft === 1 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${editsLeft === 1 ? "bg-red-100" : "bg-amber-100"}`}>
            <span className={`text-base font-bold ${editsLeft === 1 ? "text-red-700" : "text-amber-700"}`}>{editsLeft}</span>
          </div>
          <div>
            <p className={`text-sm font-semibold ${editsLeft === 1 ? "text-red-800" : "text-amber-800"}`}>
              {editsLeft} edit{editsLeft !== 1 ? "s" : ""} remaining
            </p>
            <p className={`text-xs ${editsLeft === 1 ? "text-red-600" : "text-amber-600"}`}>
              You can edit a pending ad up to {MAX_EDITS} times before approval. Admin will always see your latest version.
            </p>
          </div>
          <div className="ml-auto flex gap-1">
            {Array.from({ length: MAX_EDITS }).map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < editCount ? "bg-amber-400" : "bg-amber-200"}`} />
            ))}
          </div>
        </div>

        {/* Ad Details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-semibold text-[#1A1A1A]">Ad Details</h3>
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="mt-1.5 min-h-[120px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Price (CAD)</Label>
              <Input type="number" value={form.price} onChange={(e) => update("price", e.target.value)} className="mt-1.5" />
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
        </div>

        {/* Subcategory (category is locked) */}
        {subcategories.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-[#1A1A1A] mb-4">Subcategory</h3>
            <Select value={form.subcategory} onValueChange={(v) => update("subcategory", v)}>
              <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
              <SelectContent>
                {subcategories.map(s => <SelectItem key={s.slug} value={s.label}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

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
                  <div key={field.slug} className={field.field_type === "textarea" ? "md:col-span-2" : ""}>
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
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#D80621]" />
            <h3 className="font-semibold text-[#1A1A1A]">Location</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Province *</Label>
              <Select value={form.province} onValueChange={(v) => { update("province", v); update("city", ""); }}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{CANADIAN_PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>City *</Label>
              {cities.length > 0 ? (
                <Select value={form.city} onValueChange={(v) => update("city", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} className="mt-1.5" />
              )}
            </div>
          </div>
          <div>
            <Label>Postal Code</Label>
            <Input
              value={form.postal_code}
              onChange={(e) => update("postal_code", formatPostalCode(e.target.value))}
              placeholder="A1A 1A1"
              maxLength={7}
              className="mt-1.5 uppercase"
            />
            {form.postal_code && !validatePostalCode(form.postal_code, 'CA').valid && (
              <p className="text-xs text-red-500 mt-1">{validatePostalCode(form.postal_code, 'CA').message}</p>
            )}
          </div>
          {geocoding && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Updating location...
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
          </div>
          <div className="space-y-4">
            {showPhone(pref) && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <Phone className="w-4 h-4 text-gray-500 mt-2.5 shrink-0" />
                <div className="flex-1">
                  <Label>Phone Number</Label>
                  <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} className="mt-1.5 bg-white" />
                </div>
              </div>
            )}
            {showWhatsApp(pref) && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <MessageCircle className="w-4 h-4 text-green-600 mt-2.5 shrink-0" />
                <div className="flex-1">
                  <Label>WhatsApp Number</Label>
                  <Input value={form.contact_whatsapp} onChange={(e) => update("contact_whatsapp", e.target.value)} className="mt-1.5 bg-white" />
                </div>
              </div>
            )}
            {showChat(pref) && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <MessageSquare className="w-4 h-4 text-[#D80621] shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">In-App Chat</p>
                  <p className="text-xs text-gray-400">Buyers can message you directly</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={!form.title || !form.description || !form.province || !form.city || submitMutation.isPending}
          className="w-full h-12 rounded-xl bg-[#D80621] hover:bg-[#B00520] text-white font-semibold text-base"
        >
          {submitMutation.isPending
            ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Saving...</>
            : `Save Changes (${editsLeft - 1} edit${editsLeft - 1 !== 1 ? "s" : ""} will remain)`}
        </Button>
      </div>
    </div>
  );
}
