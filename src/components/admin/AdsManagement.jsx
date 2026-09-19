import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { format } from "date-fns";
import {
  Plus, Trash2, RefreshCw, Megaphone, Eye, MousePointerClick,
  ToggleLeft, ToggleRight, CheckCircle, XCircle, Clock,
  Image, Film, Images, ExternalLink, Mail, User, Search,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const PLACEMENTS = ["homepage", "browse", "listing-detail", "sidebar"];

const TABS = [
  { id: "pending", label: "Pending Approval", icon: Clock },
  { id: "active", label: "Active", icon: CheckCircle },
  { id: "all", label: "All Ads", icon: Megaphone },
];

const STATUS_BADGE = {
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-green-50 text-green-700 border-green-200",
  paused: "bg-gray-50 text-gray-500 border-gray-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const MEDIA_ICON = {
  image: <Image className="w-3.5 h-3.5" />,
  slideshow: <Images className="w-3.5 h-3.5" />,
  video: <Film className="w-3.5 h-3.5" />,
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

const EMPTY_FORM = { title: "", image_url: "", link_url: "", placement: "homepage", end_date: "" };

export default function AdsManagement() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [showModal, setShowModal] = useState(false);
  const [previewAd, setPreviewAd] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase.from("advertisements").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["promoted-ads-homepage"] });
      toast.success(status === "active" ? "Ad approved and live!" : status === "rejected" ? "Ad rejected." : "Status updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteAd = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("advertisements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["promoted-ads-homepage"] });
      toast.success("Advertisement removed");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const createAd = useMutation({
    mutationFn: async (payload) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("advertisements").insert({
        ...payload,
        status: "active",
        created_by: user?.email,
        end_date: payload.end_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["promoted-ads-homepage"] });
      toast.success("Advertisement created");
      setShowModal(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error("Failed to create advertisement"),
  });

  // Derived counts
  const pendingAds = ads.filter(a => a.status === "pending_approval");
  const activeAds = ads.filter(a => a.status === "active");
  const totalImpressions = ads.reduce((s, a) => s + (a.impressions || 0), 0);
  const totalClicks = ads.reduce((s, a) => s + (a.clicks || 0), 0);

  const displayAds = tab === "pending" ? pendingAds
    : tab === "active" ? activeAds
    : ads;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-600">{pendingAds.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{activeAds.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active Ads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" />
              <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Total Impressions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-gray-400" />
              <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Total Clicks</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    tab === id ? "bg-[#D80621] text-white" : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {id === "pending" && pendingAds.length > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === id ? "bg-white/20" : "bg-amber-100 text-amber-700"}`}>
                      {pendingAds.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setShowModal(true)} className="bg-[#D80621] hover:bg-[#B00520]">
              <Plus className="w-4 h-4 mr-1.5" /> New Ad
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : displayAds.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                {tab === "pending" ? "No ads awaiting approval" : "No advertisements"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {displayAds.map(ad => (
                <div key={ad.id} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div
                      className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0 cursor-pointer"
                      onClick={() => setPreviewAd(ad)}
                    >
                      {ad.image_url ? (
                        <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                      ) : ad.media_type === "video" ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                          <Film className="w-5 h-5 text-gray-400" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Megaphone className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{ad.title}</p>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[ad.status] || "border-gray-200"}`}>
                          {ad.status?.replace("_", " ")}
                        </Badge>
                        {ad.media_type && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                            {MEDIA_ICON[ad.media_type]} {ad.media_type}
                          </span>
                        )}
                      </div>

                      {(ad.advertiser_name || ad.advertiser_email) && (
                        <div className="flex items-center gap-3 mt-1">
                          {ad.advertiser_name && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <User className="w-3 h-3" /> {ad.advertiser_name}
                            </span>
                          )}
                          {ad.advertiser_email && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {ad.advertiser_email}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {ad.link_url && (
                          <a href={ad.link_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 truncate max-w-[180px]">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {ad.link_url.replace(/^https?:\/\//, "").split("/")[0]}
                          </a>
                        )}
                        <span className="text-xs text-gray-400">
                          {ad.impressions || 0} impressions · {ad.clicks || 0} clicks
                        </span>
                        {ad.amount_paid && (
                          <span className="text-xs text-green-600 font-medium">${ad.amount_paid} CAD paid</span>
                        )}
                        {ad.end_date && (
                          <span className="text-xs text-gray-400">
                            Expires {format(new Date(ad.end_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {ad.status === "pending_approval" && (
                        <>
                          <button
                            onClick={() => updateStatus.mutate({ id: ad.id, status: "active" })}
                            disabled={updateStatus.isPending}
                            title="Approve"
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => updateStatus.mutate({ id: ad.id, status: "rejected" })}
                            disabled={updateStatus.isPending}
                            title="Reject"
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}

                      {(ad.status === "active" || ad.status === "paused") && (
                        <button
                          onClick={() => updateStatus.mutate({ id: ad.id, status: ad.status === "active" ? "paused" : "active" })}
                          className="text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-100"
                          title={ad.status === "active" ? "Pause" : "Activate"}
                        >
                          {ad.status === "active"
                            ? <ToggleRight className="w-5 h-5 text-green-500" />
                            : <ToggleLeft className="w-5 h-5" />}
                        </button>
                      )}

                      <button
                        onClick={() => setPreviewAd(ad)}
                        className="text-gray-400 hover:text-blue-500 p-1.5 rounded hover:bg-blue-50"
                        title="View details"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this ad?")) deleteAd.mutate(ad.id); }}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Detail Dialog */}
      <Dialog open={!!previewAd} onOpenChange={() => setPreviewAd(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Ad Details
              {previewAd && (
                <Badge variant="outline" className={`text-xs ${STATUS_BADGE[previewAd.status] || "border-gray-200"}`}>
                  {previewAd.status?.replace("_", " ")}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewAd && (
            <div className="space-y-5">

              {/* Media Preview — detect from video_url if media_type column missing */}
              {(previewAd.media_type === "video" || (!previewAd.media_type && previewAd.video_url)) && previewAd.video_url && (() => {
                const embedUrl = getVideoEmbedUrl(previewAd.video_url);
                return embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="w-full rounded-xl aspect-video bg-black"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={previewAd.title}
                  />
                ) : (
                  <video src={previewAd.video_url} controls className="w-full rounded-xl aspect-video bg-black" />
                );
              })()}
              {previewAd.media_type !== "video" && previewAd.image_url && (
                <img src={previewAd.image_url} alt="" className="w-full rounded-xl object-cover aspect-video" />
              )}
              {previewAd.media_type === "slideshow" && previewAd.images?.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {previewAd.images.slice(1).map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full aspect-square rounded-lg object-cover" />
                  ))}
                </div>
              )}

              {/* Advertiser Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Advertiser Information</p>
                <div className="grid grid-cols-2 gap-3">
                  {previewAd.advertiser_name && (
                    <div>
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="text-sm font-medium text-gray-900">{previewAd.advertiser_name}</p>
                    </div>
                  )}
                  {previewAd.advertiser_email && (
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <a href={`mailto:${previewAd.advertiser_email}`} className="text-sm font-medium text-blue-600 hover:underline">
                        {previewAd.advertiser_email}
                      </a>
                    </div>
                  )}
                  {(previewAd.created_by && !previewAd.advertiser_email) && (
                    <div>
                      <p className="text-xs text-gray-400">Submitted by</p>
                      <p className="text-sm font-medium text-gray-900">{previewAd.created_by}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ad Content */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ad Content</p>
                <div>
                  <p className="text-xs text-gray-400">Title</p>
                  <p className="text-sm font-semibold text-gray-900">{previewAd.title}</p>
                </div>
                {previewAd.description && (
                  <div>
                    <p className="text-xs text-gray-400">Description / Tagline</p>
                    <p className="text-sm text-gray-700">{previewAd.description}</p>
                  </div>
                )}
                {previewAd.link_url && (
                  <div>
                    <p className="text-xs text-gray-400">Website URL</p>
                    <a href={previewAd.link_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all">
                      {previewAd.link_url}
                    </a>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Media Type</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{previewAd.media_type || "image"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Placement</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{previewAd.placement}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              {(previewAd.amount_paid || previewAd.transaction_id) && (
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment</p>
                  <div className="grid grid-cols-2 gap-3">
                    {previewAd.amount_paid && (
                      <div>
                        <p className="text-xs text-gray-400">Amount Paid</p>
                        <p className="text-sm font-bold text-green-700">${previewAd.amount_paid} CAD</p>
                      </div>
                    )}
                    {previewAd.transaction_id && (
                      <div>
                        <p className="text-xs text-gray-400">Transaction ID</p>
                        <p className="text-sm font-mono text-gray-700">{previewAd.transaction_id}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Submitted</p>
                  <p className="font-medium text-gray-900">
                    {previewAd.created_at ? format(new Date(previewAd.created_at), "MMM d, yyyy h:mm a") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Expires</p>
                  <p className="font-medium text-gray-900">
                    {previewAd.end_date ? format(new Date(previewAd.end_date), "MMM d, yyyy") : "No expiry"}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              {previewAd.status === "pending_approval" && (
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl"
                    onClick={() => { updateStatus.mutate({ id: previewAd.id, status: "active" }); setPreviewAd(null); }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve & Go Live
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                    onClick={() => { updateStatus.mutate({ id: previewAd.id, status: "rejected" }); setPreviewAd(null); }}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Ad Dialog (admin direct create) */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Advertisement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input className="mt-1.5" placeholder="Ad title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input className="mt-1.5" placeholder="https://..." value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
            </div>
            <div>
              <Label>Link URL</Label>
              <Input className="mt-1.5" placeholder="https://..." value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} />
            </div>
            <div>
              <Label>Placement</Label>
              <Select value={form.placement} onValueChange={v => setForm(f => ({ ...f, placement: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLACEMENTS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>End Date (optional)</Label>
              <Input className="mt-1.5" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button
              className="bg-[#D80621] hover:bg-[#B00520]"
              onClick={() => createAd.mutate(form)}
              disabled={!form.title || createAd.isPending}
            >
              {createAd.isPending ? "Creating..." : "Create Ad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
