import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import {
  Megaphone, Clock, CheckCircle, XCircle, PauseCircle,
  ExternalLink, Image, Film, Images, Plus, ChevronRight,
  Calendar, CreditCard, Eye, MousePointerClick, AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS_CONFIG = {
  pending_approval: {
    label: "Pending Review",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Your ad is being reviewed by our team. This usually takes up to 24 hours.",
  },
  active: {
    label: "Live",
    icon: CheckCircle,
    className: "bg-green-50 text-green-700 border-green-200",
    description: "Your ad is live and visible in the Promoted Content section.",
  },
  paused: {
    label: "Paused",
    icon: PauseCircle,
    className: "bg-gray-100 text-gray-600 border-gray-200",
    description: "Your ad is temporarily paused by an admin.",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
    description: "Your ad was not approved. Please contact support for more information.",
  },
};

const MEDIA_ICON = {
  image: <Image className="w-4 h-4" />,
  slideshow: <Images className="w-4 h-4" />,
  video: <Film className="w-4 h-4" />,
};

function getVideoEmbedUrl(url) {
  if (!url) return null;
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

function AdDetailModal({ ad, open, onClose }) {
  if (!ad) return null;
  const embedUrl = ad.media_type === "video" ? getVideoEmbedUrl(ad.video_url) : null;
  const StatusIcon = STATUS_CONFIG[ad.status]?.icon || Clock;
  const statusCfg = STATUS_CONFIG[ad.status] || STATUS_CONFIG.pending_approval;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advertisement Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">

          {/* Status banner */}
          <div className={`flex items-start gap-3 p-3 rounded-xl border ${statusCfg.className}`}>
            <StatusIcon className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">{statusCfg.label}</p>
              <p className="text-xs mt-0.5 opacity-80">{statusCfg.description}</p>
            </div>
          </div>

          {/* Media preview — detect from video_url if media_type missing */}
          {(ad.media_type === "video" || (!ad.media_type && ad.video_url)) && ad.video_url && (
            <div className="rounded-xl overflow-hidden bg-black aspect-video">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={ad.title}
                />
              ) : (
                <video src={ad.video_url} controls className="w-full h-full" />
              )}
            </div>
          )}
          {(ad.media_type === "image" || ad.media_type === "slideshow" || (!ad.media_type && !ad.video_url)) && ad.image_url && (
            <img src={ad.image_url} alt={ad.title} className="w-full rounded-xl object-cover aspect-video" />
          )}
          {ad.media_type === "slideshow" && ad.images?.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {ad.images.slice(1).map((url, i) => (
                <img key={i} src={url} alt="" className="w-full aspect-square rounded-lg object-cover" />
              ))}
            </div>
          )}

          {/* Ad info */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400">Ad Title</p>
              <p className="text-sm font-semibold text-gray-900">{ad.title}</p>
            </div>
            {ad.description && (
              <div>
                <p className="text-xs text-gray-400">Description</p>
                <p className="text-sm text-gray-700">{ad.description}</p>
              </div>
            )}
            {ad.link_url && (
              <div>
                <p className="text-xs text-gray-400">Website</p>
                <a href={ad.link_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> {ad.link_url}
                </a>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400">Media Type</p>
                <p className="text-sm font-medium capitalize">{ad.media_type || "image"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Placement</p>
                <p className="text-sm font-medium capitalize">{ad.placement}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          {ad.status === "active" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-lg font-bold text-gray-900">{ad.impressions || 0}</p>
                  <p className="text-xs text-gray-400">Impressions</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-lg font-bold text-gray-900">{ad.clicks || 0}</p>
                  <p className="text-xs text-gray-400">Clicks</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment & dates */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {ad.amount_paid && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Amount Paid</span>
                <span className="font-semibold text-green-700">${ad.amount_paid} CAD</span>
              </div>
            )}
            {ad.transaction_id && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transaction ID</span>
                <span className="font-mono text-xs text-gray-700">{ad.transaction_id}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Submitted</span>
              <span className="font-medium">{ad.created_at ? format(new Date(ad.created_at), "MMM d, yyyy") : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Expires</span>
              <span className="font-medium">{ad.end_date ? format(new Date(ad.end_date), "MMM d, yyyy") : "No expiry"}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MyPromotions() {
  const { user } = useAuth();
  const [selectedAd, setSelectedAd] = useState(null);
  const [rlsBlocked, setRlsBlocked] = useState(false);

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["my-promotions", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      // Query by created_by — always-present column, works before migration
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .eq("created_by", user.email)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[MyPromotions]", error);
        // RLS is blocking — user needs to run setup SQL
        if (error.code === "42501" || error.message?.includes("policy") || error.message?.includes("permission")) {
          setRlsBlocked(true);
        }
        return [];
      }
      setRlsBlocked(false);
      return data || [];
    },
    enabled: !!user?.email,
  });

  return (
    <div className="min-h-screen bg-[#F8F8F8] py-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">My Promotions</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track and manage your advertisement submissions</p>
          </div>
          <Link to={createPageUrl("Advertise")}>
            <Button className="bg-[#D80621] hover:bg-[#B00520] rounded-xl gap-2">
              <Plus className="w-4 h-4" /> New Ad
            </Button>
          </Link>
        </div>

        {/* RLS blocked notice */}
        {rlsBlocked && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Database setup required</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Run <code className="bg-amber-100 px-1 rounded">supabase/setup-advertisements.sql</code> in your Supabase SQL Editor to enable viewing your own promotions.
              </p>
            </div>
          </div>
        )}

        {/* Stats row */}
        {ads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
              const count = ads.filter(a => a.status === status).length;
              const Icon = cfg.icon;
              return (
                <div key={status} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.className}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-400">{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Ad list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
                <Skeleton className="w-24 h-16 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-7 h-7 text-gray-300" />
            </div>
            <h3 className="font-semibold text-[#1A1A1A] mb-1">No promotions yet</h3>
            <p className="text-sm text-gray-500 mb-5">Reach thousands of community members with a promoted ad.</p>
            <Link to={createPageUrl("Advertise")}>
              <Button className="bg-[#D80621] hover:bg-[#B00520] rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> Create Your First Ad
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {ads.map(ad => {
              const statusCfg = STATUS_CONFIG[ad.status] || STATUS_CONFIG.pending_approval;
              const StatusIcon = statusCfg.icon;
              return (
                <button
                  key={ad.id}
                  onClick={() => setSelectedAd(ad)}
                  className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md hover:border-gray-200 transition-all text-left group"
                >
                  {/* Thumbnail */}
                  <div className="w-24 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {ad.image_url ? (
                      <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                    ) : ad.media_type === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <Film className="w-5 h-5 text-gray-400" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{ad.title}</p>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${statusCfg.className}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusCfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        {MEDIA_ICON[ad.media_type] || MEDIA_ICON.image}
                        <span className="capitalize">{ad.media_type || "image"}</span>
                      </span>
                      {ad.amount_paid && (
                        <span className="text-green-600 font-medium">${ad.amount_paid} CAD</span>
                      )}
                      {ad.created_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(ad.created_at), "MMM d, yyyy")}
                        </span>
                      )}
                      {ad.status === "active" && (
                        <span className="flex items-center gap-2">
                          <Eye className="w-3 h-3" /> {ad.impressions || 0}
                          <MousePointerClick className="w-3 h-3 ml-1" /> {ad.clicks || 0}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AdDetailModal ad={selectedAd} open={!!selectedAd} onClose={() => setSelectedAd(null)} />
    </div>
  );
}
