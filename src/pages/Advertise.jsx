import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CheckCircle, CreditCard, Image, Film, Images,
  Upload, X, Loader2, ArrowRight, ArrowLeft, Megaphone,
  Globe, Mail, User, FileText, Link as LinkIcon,
  ChevronLeft, ChevronRight, Play,
} from "lucide-react";

const AD_PRICE = 49.99;
const AD_DURATION_DAYS = 30;
const STEPS = ["Details", "Media", "Payment", "Confirmation"];

// ── Animated slideshow preview ────────────────────────────────────────────────
function SlideshowPreview({ images }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (images.length < 2) return;
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % images.length), 3000);
    return () => clearInterval(timerRef.current);
  }, [images.length]);

  const go = (dir) => {
    clearInterval(timerRef.current);
    setIdx(i => (i + dir + images.length) % images.length);
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % images.length), 3000);
  };

  if (!images.length) return null;

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-video group">
      {images.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      {images.length > 1 && (
        <>
          <button onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
      <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
        Slideshow Preview · {idx + 1}/{images.length}
      </div>
    </div>
  );
}

// ── YouTube / Vimeo embed URL helper ─────────────────────────────────────────
function getEmbedUrl(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                done ? "bg-green-500 text-white" : active ? "bg-[#D80621] text-white" : "bg-gray-100 text-gray-400"
              }`}>
                {done ? <CheckCircle className="w-4 h-4" /> : step}
              </div>
              <span className={`text-xs font-medium ${active ? "text-[#D80621]" : "text-gray-400"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-10 mb-4 transition-all ${done ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function Advertise() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);

  // Step 1 — Details
  const [details, setDetails] = useState({
    advertiser_name: user?.user_metadata?.full_name || "",
    advertiser_email: user?.email || "",
    title: "",
    description: "",
    link_url: "",
  });

  // Step 2 — Media
  const [mediaType, setMediaType] = useState("image"); // 'image' | 'slideshow' | 'video'
  const [singleImage, setSingleImage] = useState(null);
  const [slideshowImages, setSlideshowImages] = useState([]);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(""); // file upload
  const [youtubeInput, setYoutubeInput] = useState("");         // raw typed URL
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState("");   // validated embed URL

  // Derived final video URL for submission
  const finalVideoUrl = uploadedVideoUrl || youtubeInput;

  // Step 3 — Payment
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [paying, setPaying] = useState(false);

  const updateDetail = (k, v) => setDetails(d => ({ ...d, [k]: v }));

  // ── File upload helper ────────────────────────────────────────────────────
  const uploadFile = async (file, pathPrefix) => {
    const ext = file.name.split(".").pop().toLowerCase();
    const fileName = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("listing-images").upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("listing-images").getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSingleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { setSingleImage(await uploadFile(file, "advertisements")); }
    catch { toast.error("Upload failed — please try again."); }
    finally { setUploading(false); }
  };

  const handleSlideshowUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (slideshowImages.length + files.length > 5) { toast.error("Maximum 5 images for a slideshow"); return; }
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(f => uploadFile(f, "advertisements")));
      setSlideshowImages(prev => [...prev, ...urls]);
    } catch { toast.error("Upload failed — please try again."); }
    finally { setUploading(false); }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "advertisements/videos");
      setUploadedVideoUrl(url);
      setYoutubeInput("");
      setYoutubeEmbedUrl("");
    } catch { toast.error("Upload failed — please try again."); }
    finally { setUploading(false); }
  };

  const handleYoutubeInputChange = (val) => {
    setYoutubeInput(val);
    setYoutubeEmbedUrl(getEmbedUrl(val) || "");
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const step1Valid = details.advertiser_name && details.advertiser_email && details.title && details.link_url;
  const step2Valid = (
    (mediaType === "image" && singleImage) ||
    (mediaType === "slideshow" && slideshowImages.length >= 2) ||
    (mediaType === "video" && (uploadedVideoUrl || youtubeEmbedUrl))
  );
  const step3Valid = cardName && cardNumber.length >= 19 && expiry.length === 5 && cvv.length >= 3;

  // ── Payment + submit ──────────────────────────────────────────────────────
  const handlePayAndSubmit = async () => {
    if (!step3Valid) { toast.error("Please complete all payment fields"); return; }
    setPaying(true);
    try {
      const txnId = "ADV-" + Date.now();
      const endDate = new Date(Date.now() + AD_DURATION_DAYS * 86400000).toISOString();
      const imageUrl = mediaType === "image" ? singleImage : (slideshowImages[0] || null);

      const fullPayload = {
        ...details,
        placement: "homepage",
        status: "pending_approval",
        media_type: mediaType,
        image_url: imageUrl,
        images: mediaType === "slideshow" ? slideshowImages : (singleImage ? [singleImage] : []),
        video_url: mediaType === "video" ? finalVideoUrl : null,
        amount_paid: AD_PRICE,
        payment_status: "paid",
        transaction_id: txnId,
        created_by: user?.email || details.advertiser_email,
        end_date: endDate,
      };

      const minimalPayload = {
        title: details.title,
        link_url: details.link_url,
        image_url: imageUrl,
        placement: "homepage",
        status: "pending_approval",
        created_by: user?.email || details.advertiser_email,
        end_date: endDate,
      };

      let result = await supabase.from("advertisements").insert(fullPayload);

      if (result.error && (result.error.code === "PGRST204" || result.error.message?.includes("Could not find"))) {
        console.warn("[Advertise] New columns not found, falling back to minimal insert.");
        result = await supabase.from("advertisements").insert(minimalPayload);
      }

      if (result.error) {
        console.error("[Advertise] Insert error:", result.error);
        toast.error(result.error.code === "42501"
          ? "Permission denied. Please ask admin to run supabase/setup-advertisements.sql."
          : `Submission failed: ${result.error.message}`);
        return;
      }

      setStep(4);
    } catch (err) {
      console.error("[Advertise] Unexpected error:", err);
      toast.error("Submission failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#D80621]/10 mb-4">
            <Megaphone className="w-6 h-6 text-[#D80621]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Promote Your Content</h1>
          <p className="text-gray-500 text-sm mt-1">Reach thousands of Desi community members across Canada</p>
        </div>

        <StepIndicator current={step} />

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">

          {/* ── STEP 1: Details ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-[#1A1A1A] text-base mb-4">Business / Ad Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Your Name *</Label>
                  <Input className="mt-1.5" placeholder="John Doe" value={details.advertiser_name}
                    onChange={e => updateDetail("advertiser_name", e.target.value)} />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email *</Label>
                  <Input className="mt-1.5" type="email" placeholder="you@example.com" value={details.advertiser_email}
                    onChange={e => updateDetail("advertiser_email", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Ad Title *</Label>
                <Input className="mt-1.5" placeholder="e.g. Best South Asian Grocery in Toronto" value={details.title}
                  onChange={e => updateDetail("title", e.target.value)} maxLength={80} />
                <p className="text-xs text-gray-400 mt-1">{details.title.length}/80 characters</p>
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Description / Tagline</Label>
                <Textarea className="mt-1.5 min-h-[80px]" placeholder="A short line that describes your business or offer..."
                  value={details.description} onChange={e => updateDetail("description", e.target.value)} maxLength={200} />
                <p className="text-xs text-gray-400 mt-1">{details.description.length}/200 characters</p>
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Website / Landing Page URL *</Label>
                <Input className="mt-1.5" placeholder="https://yourbusiness.com" value={details.link_url}
                  onChange={e => updateDetail("link_url", e.target.value)} />
              </div>
              <Button className="w-full h-11 bg-[#D80621] hover:bg-[#B00520] rounded-xl mt-2"
                onClick={() => setStep(2)} disabled={!step1Valid}>
                Next: Upload Media <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ── STEP 2: Media ────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-[#1A1A1A] text-base">Choose Your Ad Media</h2>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: "image", icon: <Image className="w-5 h-5" />, label: "Single Image" },
                  { type: "slideshow", icon: <Images className="w-5 h-5" />, label: "Slideshow" },
                  { type: "video", icon: <Film className="w-5 h-5" />, label: "Video" },
                ].map(({ type, icon, label }) => (
                  <button key={type} onClick={() => setMediaType(type)}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 text-sm font-medium transition-all ${
                      mediaType === type ? "border-[#D80621] bg-red-50 text-[#D80621]" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    {icon}{label}
                  </button>
                ))}
              </div>

              {/* ── Single Image ── */}
              {mediaType === "image" && (
                <div>
                  {singleImage ? (
                    <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-video">
                      <img src={singleImage} alt="Ad preview" className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">Preview</div>
                      <button onClick={() => setSingleImage(null)}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80">
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#D80621]/40 hover:bg-red-50/30 transition-all">
                      <input type="file" accept="image/*" className="hidden" onChange={handleSingleImageUpload} disabled={uploading} />
                      {uploading ? <Loader2 className="w-8 h-8 animate-spin text-gray-300 mx-auto" /> : <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />}
                      <p className="text-sm text-gray-500 font-medium">{uploading ? "Uploading..." : "Click to upload image"}</p>
                      <p className="text-xs text-gray-400 mt-1">Recommended: 1200×628px, JPG/PNG</p>
                    </label>
                  )}
                </div>
              )}

              {/* ── Slideshow ── */}
              {mediaType === "slideshow" && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Upload 2–5 images. They auto-advance every 3 seconds in the preview below.</p>

                  {/* Live animated preview */}
                  {slideshowImages.length >= 1 && <SlideshowPreview images={slideshowImages} />}

                  {/* Thumbnail grid + add button */}
                  <div className="grid grid-cols-4 gap-2">
                    {slideshowImages.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setSlideshowImages(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {slideshowImages.length < 5 && (
                      <label className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#D80621]/40 hover:bg-red-50/30 transition-all">
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleSlideshowUpload} disabled={uploading} />
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin text-gray-300" /> : <Upload className="w-5 h-5 text-gray-300" />}
                        <span className="text-xs text-gray-400 mt-1">{uploading ? "..." : "Add"}</span>
                      </label>
                    )}
                  </div>
                  {slideshowImages.length < 2 && (
                    <p className="text-xs text-amber-600">Upload at least 2 images for a slideshow.</p>
                  )}
                </div>
              )}

              {/* ── Video ── */}
              {mediaType === "video" && (
                <div className="space-y-4">
                  {/* Uploaded video preview */}
                  {uploadedVideoUrl ? (
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                      <video src={uploadedVideoUrl} controls className="w-full h-full" />
                      <button onClick={() => setUploadedVideoUrl("")}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80">
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="block border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#D80621]/40 hover:bg-red-50/30 transition-all">
                      <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploading} />
                      {uploading ? <Loader2 className="w-8 h-8 animate-spin text-gray-300 mx-auto" /> : <Film className="w-8 h-8 text-gray-300 mx-auto mb-2" />}
                      <p className="text-sm text-gray-500 font-medium">{uploading ? "Uploading..." : "Click to upload video file"}</p>
                      <p className="text-xs text-gray-400 mt-1">MP4, MOV, WebM — max 50MB</p>
                    </label>
                  )}

                  {/* OR divider */}
                  {!uploadedVideoUrl && (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">OR</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>

                      {/* YouTube / Vimeo URL input */}
                      <div>
                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                          <LinkIcon className="w-3.5 h-3.5 text-[#D80621]" /> Paste a YouTube or Vimeo URL
                        </Label>
                        <Input className="mt-1.5 text-sm" placeholder="https://youtube.com/watch?v=..."
                          value={youtubeInput} onChange={e => handleYoutubeInputChange(e.target.value)} />
                        {youtubeInput && !youtubeEmbedUrl && (
                          <p className="text-xs text-amber-600 mt-1">Paste a valid YouTube or Vimeo URL to preview.</p>
                        )}
                      </div>

                      {/* YouTube / Vimeo live embed preview */}
                      {youtubeEmbedUrl && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <Play className="w-3 h-3" /> Video detected — preview below
                          </p>
                          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                            <iframe
                              key={youtubeEmbedUrl}
                              src={youtubeEmbedUrl}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Video preview"
                            />
                            <button onClick={() => { setYoutubeInput(""); setYoutubeEmbedUrl(""); }}
                              className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80">
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button className="flex-1 h-11 bg-[#D80621] hover:bg-[#B00520] rounded-xl"
                  onClick={() => setStep(3)} disabled={!step2Valid || uploading}>
                  Next: Payment <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Payment ──────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-[#1A1A1A] text-base">Payment Details</h2>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ad placement — Homepage (30 days)</span>
                  <span className="font-semibold">${AD_PRICE} CAD</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Visibility</span><span>Thousands of daily visitors</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-[#D80621] text-lg">${AD_PRICE} CAD</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Your ad goes live after admin approval (usually within 24h).
              </p>
              <div>
                <Label>Cardholder Name</Label>
                <Input className="mt-1.5" placeholder="Name on card" value={cardName} onChange={e => setCardName(e.target.value)} />
              </div>
              <div>
                <Label>Card Number</Label>
                <Input className="mt-1.5" placeholder="1234 5678 9012 3456" maxLength={19} value={cardNumber}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, "").substring(0, 16);
                    setCardNumber(v.replace(/(.{4})/g, "$1 ").trim());
                  }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Expiry</Label>
                  <Input className="mt-1.5" placeholder="MM/YY" maxLength={5} value={expiry}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, "").substring(0, 4);
                      setExpiry(v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v);
                    }} />
                </div>
                <div>
                  <Label>CVV</Label>
                  <Input className="mt-1.5" placeholder="•••" maxLength={4} type="password" value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button className="flex-1 h-11 bg-[#D80621] hover:bg-[#B00520] rounded-xl font-semibold"
                  onClick={handlePayAndSubmit} disabled={paying || !step3Valid}>
                  {paying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  {paying ? "Processing..." : `Pay $${AD_PRICE} & Submit`}
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Success ──────────────────────────────────────────── */}
          {step === 4 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-[#1A1A1A]">Ad Submitted!</h2>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">
                Your payment was received. Our team will review and activate it within <strong>24 hours</strong>.
                You'll see it in the <em>Promoted Content</em> section on the homepage.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1.5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Ad Summary</p>
                <p className="text-sm font-semibold text-[#1A1A1A]">{details.title}</p>
                <p className="text-xs text-gray-400">{details.link_url}</p>
                <p className="text-xs text-gray-400">Duration: {AD_DURATION_DAYS} days · ${AD_PRICE} CAD paid</p>
              </div>
              <Button className="w-full bg-[#D80621] hover:bg-[#B00520] rounded-xl h-11"
                onClick={() => navigate(createPageUrl("Home"))}>
                Back to Home
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
