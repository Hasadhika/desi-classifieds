import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { format } from "date-fns";
import {
  Search, CheckCircle, XCircle, Star, StarOff, Eye, Trash2, RefreshCw, AlertTriangle, ListChecks,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_COLORS = {
  active: "text-green-700 border-green-200 bg-green-50",
  pending: "text-amber-700 border-amber-200 bg-amber-50",
  rejected: "text-red-700 border-red-200 bg-red-50",
  expired: "text-gray-600 border-gray-200 bg-gray-50",
  sold: "text-blue-700 border-blue-200 bg-blue-50",
  flagged: "text-orange-700 border-orange-200 bg-orange-50",
};

export default function ListingsManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Status changes — use SECURITY DEFINER RPC (same one used in MyAds, bypasses JWT email issue)
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase.rpc("update_listing_status", {
        p_listing_id: id,
        p_new_status: status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      toast.success("Listing updated");
    },
    onError: (err) => toast.error(`Failed to update listing: ${err?.message || ""}`),
  });

  // Non-status changes (e.g. featured flag) — direct update
  const updateListing = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase.from("listings").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      toast.success("Listing updated");
    },
    onError: (err) => toast.error(`Failed to update listing: ${err?.message || ""}`),
  });

  const deleteListing = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      toast.success("Listing deleted");
    },
    onError: () => toast.error("Failed to delete listing"),
  });

  const filtered = listings.filter(l => {
    const matchesSearch = !search ||
      l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.poster_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.city?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: listings.length,
    flagged: listings.filter(l => l.status === "flagged").length,
    pending: listings.filter(l => l.status === "pending").length,
    active: listings.filter(l => l.status === "active").length,
    rejected: listings.filter(l => l.status === "rejected").length,
    sold: listings.filter(l => l.status === "sold").length,
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-6 gap-3">
        {Object.entries(counts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`p-3 rounded-xl border text-left transition-all ${statusFilter === status ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white hover:border-gray-300"}`}
          >
            <p className="text-xl font-bold">{count}</p>
            <p className={`text-xs capitalize mt-0.5 ${statusFilter === status ? "text-gray-300" : "text-gray-500"}`}>{status === "all" ? "Total" : status}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by title, email, city..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No listings found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(listing => (
                <div key={listing.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    {listing.images?.[0] ? (
                      <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Eye className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{listing.title}</p>
                      {listing.is_featured && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                      {listing.is_urgent && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {listing.poster_email} &bull; {listing.city}, {listing.province} &bull; {listing.views || 0} views
                    </p>
                    <p className="text-xs text-gray-400">
                      {listing.created_date ? format(new Date(listing.created_date), "MMM d, yyyy") : "—"} &bull; ${listing.price || 0}
                    </p>
                  </div>

                  <Badge variant="outline" className={STATUS_COLORS[listing.status] || ""}>
                    {listing.status}
                  </Badge>

                  <div className="flex items-center gap-1 shrink-0">
                    {(listing.status === "pending" || listing.status === "flagged") && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2"
                          title="Approve"
                          onClick={() => updateStatus.mutate({ id: listing.id, status: "active" })}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                          title="Reject"
                          onClick={() => updateStatus.mutate({ id: listing.id, status: "rejected" })}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {listing.status === "active" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                        onClick={() => updateStatus.mutate({ id: listing.id, status: "rejected" })}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-8 px-2 ${listing.is_featured ? "text-yellow-600 hover:bg-yellow-50" : "text-gray-400 hover:bg-gray-100"}`}
                      onClick={() => updateListing.mutate({ id: listing.id, updates: { is_featured: !listing.is_featured } })}
                    >
                      {listing.is_featured ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                      onClick={() => {
                        if (confirm("Delete this listing?")) deleteListing.mutate(listing.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
