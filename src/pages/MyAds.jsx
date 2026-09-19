import React, { useState } from "react";
import { listingsApi } from "@/api/listingsApi";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Eye, MoreVertical, CheckCircle2, RotateCcw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_COLORS = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  sold: "bg-blue-100 text-blue-700",
  expired: "bg-gray-100 text-gray-500",
  rejected: "bg-red-100 text-red-700",
};

export default function MyAds() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [confirmSoldId, setConfirmSoldId] = useState(null);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["my-listings", currentUser?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('poster_email', currentUser.email)
        .order('created_date', { ascending: false })
        .limit(50);
      if (error) {
        console.error('[MyAds] listings query error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentUser?.email,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => listingsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success("Listing deleted");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase.rpc('update_listing_status', {
        p_listing_id: id,
        p_new_status: status,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
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

  const handleMarkSold = (id) => {
    setConfirmSoldId(id);
  };

  const confirmMarkSold = () => {
    if (confirmSoldId) {
      updateStatusMutation.mutate({ id: confirmSoldId, status: "sold" });
      setConfirmSoldId(null);
    }
  };

  return (
    <div className="page-enter min-h-screen bg-[#F8F8F8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">My Ads</h1>
          <Link to={createPageUrl("PostAd")}>
            <Button className="bg-[#D80621] hover:bg-[#B00520] rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Post New Ad
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="font-semibold text-lg">No ads yet</h3>
            <p className="text-gray-500 mt-1 text-sm">Post your first ad and reach the community</p>
            <Link to={createPageUrl("PostAd")}>
              <Button className="mt-4 bg-[#D80621] hover:bg-[#B00520] rounded-xl">Post Your First Ad</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map(listing => (
              <div key={listing.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
                  <img
                    src={listing.images?.[0] || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=200&fit=crop"}
                    alt=""
                    className={`w-full h-full object-cover ${listing.status === "sold" ? "opacity-50" : ""}`}
                  />
                  {listing.status === "sold" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Sold</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-[#1A1A1A] truncate">{listing.title}</h3>
                    <Badge className={`${STATUS_COLORS[listing.status]} text-[10px] shrink-0`}>{listing.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">{listing.city}, {listing.province} • {listing.created_date ? format(new Date(listing.created_date), "MMM d, yyyy") : ""}</p>
                  <p className="text-sm font-semibold text-[#D80621] mt-1">
                    {listing.price ? `$${listing.price.toLocaleString()}` : "Contact"}
                  </p>
                  {listing.status === "pending" && (() => {
                    const editCount = listing.edit_count || 0;
                    const editsLeft = 3 - editCount;
                    return (
                      <div className="mt-1 space-y-1">
                        <p className="text-[11px] text-amber-600">Awaiting admin approval before going live</p>
                        {editsLeft > 0 ? (
                          <Link to={createPageUrl("EditAd") + `?id=${listing.id}`}>
                            <button className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D80621] hover:text-[#B00520] bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-full transition-colors">
                              <Pencil className="w-3 h-3" />
                              Edit ({editsLeft} left)
                            </button>
                          </Link>
                        ) : (
                          <p className="text-[11px] text-gray-400">No edits remaining</p>
                        )}
                      </div>
                    );
                  })()}
                  {listing.status === "rejected" && (
                    <p className="mt-1 text-[11px] text-red-600">Rejected by admin — please contact support</p>
                  )}
                  {listing.status === "active" && (
                    <button
                      onClick={() => handleMarkSold(listing.id)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Switch to Sold
                    </button>
                  )}
                  {listing.status === "sold" && (
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: listing.id, status: "active" })}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-full transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reactivate
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Eye className="w-3 h-3" />{listing.views || 0}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("ListingDetail") + `?id=${listing.id}`}>View</Link>
                      </DropdownMenuItem>
                      {listing.status === "pending" && (listing.edit_count || 0) < 3 && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl("EditAd") + `?id=${listing.id}`}>Edit</Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(listing.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmSoldId} onOpenChange={() => setConfirmSoldId(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Sold?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your listing from the homepage and browse page. You can reactivate it anytime from My Ads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={confirmMarkSold}
            >
              Yes, Mark as Sold
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
