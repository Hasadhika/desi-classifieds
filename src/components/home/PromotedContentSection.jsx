import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";

async function trackImpression(id) {
  await supabase.rpc("increment_ad_impressions", { ad_id: id }).catch(() => {});
}
async function trackClick(id) {
  await supabase.rpc("increment_ad_clicks", { ad_id: id }).catch(() => {});
}

// ── YouTube / Vimeo embed URL helper ────────────────────────────────────────
function getEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&rel=0&modestbranding=1&playsinline=1`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1&background=1`;
  return null; // direct file
}

function getYtId(url) {
  return url?.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] || null;
}

// ── Parse images safely (handles array or JSON string) ──────────────────────
function parseImages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter(Boolean) : []; }
  catch { return []; }
}

// ── Slideshow Card ───────────────────────────────────────────────────────────
function SlideshowCard({ ad }) {
  const images = parseImages(ad.images).length
    ? parseImages(ad.images)
    : [ad.image_url].filter(Boolean);

  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  const next = useCallback(() => setIndex(i => (i + 1) % images.length), [images.length]);
  const prev = () => setIndex(i => (i - 1 + images.length) % images.length);

  useEffect(() => {
    if (images.length < 2) return;
    timerRef.current = setInterval(next, 3000);
    return () => clearInterval(timerRef.current);
  }, [next, images.length]);

  return (
    <AdCard ad={ad}>
      <div
        className="relative w-full aspect-video bg-gray-100 overflow-hidden rounded-t-2xl group"
        onMouseEnter={() => clearInterval(timerRef.current)}
        onMouseLeave={() => { timerRef.current = setInterval(next, 3000); }}
      >
        {images.length > 0 ? images.map((src, i) => (
          <img
            key={i} src={src} alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}
          />
        )) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Megaphone className="w-10 h-10 text-gray-300" />
          </div>
        )}

        {images.length > 1 && (
          <>
            <button onClick={e => { e.preventDefault(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={e => { e.preventDefault(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button key={i} onClick={e => { e.preventDefault(); setIndex(i); }}
                  className={`rounded-full transition-all ${i === index ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </AdCard>
  );
}

// ── Video Card — autoplays muted inline ─────────────────────────────────────
function VideoCard({ ad }) {
  const embedUrl = getEmbedUrl(ad.video_url);
  const ytId = getYtId(ad.video_url);
  // hqdefault always exists; maxresdefault may 404
  const thumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ad.image_url;

  return (
    <AdCard ad={ad}>
      <div className="relative w-full aspect-video bg-black overflow-hidden rounded-t-2xl">
        {embedUrl ? (
          // YouTube / Vimeo — autoplay muted inline
          <iframe
            key={embedUrl}
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            title={ad.title}
          />
        ) : ad.video_url ? (
          // Direct video file
          <video
            src={ad.video_url}
            className="w-full h-full object-cover"
            autoPlay muted loop playsInline
            poster={thumbnail || undefined}
          />
        ) : (
          // Fallback image
          thumbnail ? (
            <img src={thumbnail} alt={ad.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <Megaphone className="w-10 h-10 text-gray-600" />
            </div>
          )
        )}
      </div>
    </AdCard>
  );
}

// ── Image Card ───────────────────────────────────────────────────────────────
function ImageCard({ ad }) {
  return (
    <AdCard ad={ad}>
      <div className="relative w-full aspect-video bg-gray-100 overflow-hidden rounded-t-2xl">
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Megaphone className="w-10 h-10 text-gray-300" />
          </div>
        )}
      </div>
    </AdCard>
  );
}

// ── Shared Ad Card Wrapper ───────────────────────────────────────────────────
function AdCard({ ad, children }) {
  return (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer"
      onClick={() => trackClick(ad.id)}
      className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      {children}
      <div className="p-4">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full mb-2">
          <Megaphone className="w-2.5 h-2.5" /> Sponsored
        </span>
        <h3 className="font-semibold text-[#1A1A1A] text-sm leading-snug group-hover:text-[#D80621] transition-colors line-clamp-1">
          {ad.title}
        </h3>
        {ad.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ad.description}</p>
        )}
        <div className="flex items-center gap-1 mt-2 text-xs text-[#D80621] font-medium">
          <ExternalLink className="w-3 h-3" />
          {ad.link_url?.replace(/^https?:\/\//, "").split("/")[0]}
        </div>
      </div>
    </a>
  );
}

// ── Main Section ─────────────────────────────────────────────────────────────
export default function PromotedContentSection() {
  const { data: ads = [] } = useQuery({
    queryKey: ["promoted-ads-homepage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .eq("status", "active")
        .eq("placement", "homepage")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    ads.forEach(ad => trackImpression(ad.id));
  }, [ads.length]);

  if (!ads.length) return null;

  return (
    <section className="py-12 bg-[#F8F8F8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Promoted Content</h2>
            <p className="text-sm text-gray-400 mt-0.5">Sponsored by our community partners</p>
          </div>
          <span className="text-xs text-gray-400 bg-white border border-gray-100 px-3 py-1.5 rounded-full font-medium">
            Advertisement
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {ads.map(ad => {
            const images = parseImages(ad.images);
            // Determine type: use media_type column if exists, else infer
            const type = ad.media_type
              || (ad.video_url ? "video" : images.length > 1 ? "slideshow" : "image");
            if (type === "video") return <VideoCard key={ad.id} ad={ad} />;
            if (type === "slideshow") return <SlideshowCard key={ad.id} ad={ad} />;
            return <ImageCard key={ad.id} ad={ad} />;
          })}
        </div>
      </div>
    </section>
  );
}
