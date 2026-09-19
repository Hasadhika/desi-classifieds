import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { format, addDays } from "date-fns";
import { Star, Plus, RefreshCw, Search, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const PLANS = [
  { value: "basic", label: "Basic (7 days)", days: 7, price: 9.99 },
  { value: "standard", label: "Standard (14 days)", days: 14, price: 19.99 },
  { value: "premium", label: "Premium (30 days)", days: 30, price: 39.99 },
];

export default function FeaturedListingsManagement() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedListing, setSelectedListing] = useState(null);
  const [plan, setPlan] = useState("basic");
  const [amount, setAmount] = useState("9.99");

  const { data: featuredRecords = [], isLoading } = useQuery({
    queryKey: ["admin-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_listings")
        .select("*, listings(id, title, poster_email, city, province, images)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["listing-search", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, poster_email, city, province, images, is_featured")
        .ilike("title", `%${search}%`)
        .eq("status", "active")
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const addFeatured = useMutation({
    mutationFn: async () => {
      if (!selectedListing) return;
      const selectedPlan = PLANS.find(p => p.value === plan);
      const endDate = addDays(new Date(), selectedPlan.days).toISOString();
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from("listings").update({ is_featured: true }).eq("id", selectedListing.id);

      const { error } = await supabase.from("featured_listings").insert({
        listing_id: selectedListing.id,
        promoted_by: user?.email,
        plan,
        end_date: endDate,
        amount_paid: parseFloat(amount),
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-featured"] });
      toast.success("Listing featured successfully");
      setShowModal(false);
      setSelectedListing(null);
      setSearch("");
    },
    onError: () => toast.error("Failed to feature listing"),
  });

  const removeFeatured = useMutation({
    mutationFn: async ({ id, listingId }) => {
      await supabase.from("listings").update({ is_featured: false }).eq("id", listingId);
      const { error } = await supabase.from("featured_listings").update({ status: "expired" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-featured"] });
      toast.success("Removed from featured");
    },
    onError: () => toast.error("Failed to remove"),
  });

  const active = featuredRecords.filter(r => r.status === "active");
  const totalRevenue = featuredRecords.reduce((s, r) => s + (r.amount_paid || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-500">{active.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active Featured</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{featuredRecords.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Promotions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Revenue Generated</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">Featured Listings</CardTitle>
            <Button size="sm" onClick={() => setShowModal(true)} className="bg-[#D80621] hover:bg-[#B00520]">
              <Plus className="w-4 h-4 mr-1.5" />
              Feature a Listing
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : featuredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No featured listings yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {featuredRecords.map(record => (
                <div key={record.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    {record.listings?.images?.[0] ? (
                      <img src={record.listings.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Star className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{record.listings?.title || "Unknown"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {record.listings?.city}, {record.listings?.province}
                      {" · "}<span className="capitalize font-medium">{record.plan}</span> plan
                      {" · "}${record.amount_paid}
                    </p>
                    {record.end_date && (
                      <p className="text-xs text-gray-400">
                        Expires: {format(new Date(record.end_date), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>

                  <Badge
                    variant="outline"
                    className={record.status === "active" ? "text-green-700 border-green-200 bg-green-50" : "text-gray-500 border-gray-200"}
                  >
                    {record.status}
                  </Badge>

                  {record.status === "active" && (
                    <button
                      onClick={() => {
                        if (confirm("Remove this listing from featured?"))
                          removeFeatured.mutate({ id: record.id, listingId: record.listing_id });
                      }}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 shrink-0"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feature a Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Search Listing</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Type listing title..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelectedListing(null); }}
                />
              </div>
              {searchResults.length > 0 && !selectedListing && (
                <div className="mt-1 border rounded-lg overflow-hidden">
                  {searchResults.map(l => (
                    <button
                      key={l.id}
                      onClick={() => { setSelectedListing(l); setSearch(l.title); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left border-b last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{l.title}</p>
                        <p className="text-xs text-gray-400">{l.city}, {l.province} · {l.poster_email}</p>
                      </div>
                      {l.is_featured && <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 text-xs">Featured</Badge>}
                    </button>
                  ))}
                </div>
              )}
              {selectedListing && (
                <div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-green-700 font-medium truncate">{selectedListing.title}</p>
                  <button onClick={() => { setSelectedListing(null); setSearch(""); }} className="text-green-600 hover:text-green-800 ml-2 shrink-0">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <Label>Plan</Label>
              <Select value={plan} onValueChange={v => {
                setPlan(v);
                const p = PLANS.find(pl => pl.value === v);
                if (p) setAmount(String(p.price));
              }}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label} — ${p.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount Paid ($)</Label>
              <Input className="mt-1.5" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); setSelectedListing(null); setSearch(""); }}>
              Cancel
            </Button>
            <Button
              className="bg-[#D80621] hover:bg-[#B00520]"
              onClick={() => addFeatured.mutate()}
              disabled={!selectedListing || addFeatured.isPending}
            >
              {addFeatured.isPending ? "Featuring..." : "Feature Listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
