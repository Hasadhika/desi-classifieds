import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { format } from "date-fns";
import { DollarSign, CreditCard, Plus, Search, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const PLANS = ["basic", "standard", "premium", "enterprise"];
const STATUS_OPTS = ["active", "expired", "cancelled", "pending"];
const STATUS_COLORS = {
  active: "text-green-700 border-green-200 bg-green-50",
  expired: "text-gray-500 border-gray-200 bg-gray-50",
  cancelled: "text-red-700 border-red-200 bg-red-50",
  pending: "text-amber-700 border-amber-200 bg-amber-50",
  completed: "text-blue-700 border-blue-200 bg-blue-50",
};

const EMPTY_FORM = { user_email: "", plan_name: "basic", amount: "", status: "active", transaction_id: "", end_date: "" };

export default function PaymentsManagement() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: featuredPayments = [] } = useQuery({
    queryKey: ["admin-featured-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_listings")
        .select("*, listings(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createSubscription = useMutation({
    mutationFn: async (payload) => {
      const { error } = await supabase.from("subscriptions").insert({
        ...payload,
        amount: parseFloat(payload.amount) || 0,
        end_date: payload.end_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast.success("Subscription added");
      setShowModal(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error("Failed to add subscription"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase.from("subscriptions").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteSubscription = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast.success("Subscription deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const filtered = subscriptions.filter(s =>
    !search ||
    s.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    s.transaction_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.plan_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = [...subscriptions, ...featuredPayments].reduce((s, r) => s + parseFloat(r.amount || r.amount_paid || 0), 0);
  const activeCount = subscriptions.filter(s => s.status === "active").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{subscriptions.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active Plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">{featuredPayments.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Featured Payments</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="subscriptions">
            <div className="px-5 pt-4">
              <TabsList>
                <TabsTrigger value="subscriptions">
                  <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                  Subscriptions
                </TabsTrigger>
                <TabsTrigger value="featured">
                  <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                  Featured Payments
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="subscriptions" className="mt-0">
              <div className="px-5 py-3 flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="pl-9" placeholder="Search by email, plan, transaction..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button size="sm" onClick={() => setShowModal(true)} className="bg-[#D80621] hover:bg-[#B00520]">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add
                </Button>
              </div>

              <div className="divide-y">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No subscriptions found</p>
                  </div>
                ) : (
                  filtered.map(sub => (
                    <div key={sub.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{sub.user_email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          <span className="capitalize font-medium">{sub.plan_name}</span> plan
                          {sub.transaction_id && ` · TX: ${sub.transaction_id}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {sub.start_date ? format(new Date(sub.start_date), "MMM d, yyyy") : "—"}
                          {sub.end_date && ` → ${format(new Date(sub.end_date), "MMM d, yyyy")}`}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 shrink-0">${parseFloat(sub.amount || 0).toFixed(2)}</p>
                      <Select value={sub.status} onValueChange={v => updateStatus.mutate({ id: sub.id, status: v })}>
                        <SelectTrigger className="w-28 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTS.map(s => (
                            <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => { if (confirm("Delete this subscription?")) deleteSubscription.mutate(sub.id); }}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="featured" className="mt-0">
              <div className="divide-y">
                {featuredPayments.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No featured listing payments</p>
                  </div>
                ) : (
                  featuredPayments.map(fp => (
                    <div key={fp.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{fp.listings?.title || "Unknown listing"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          By: {fp.promoted_by} · <span className="capitalize font-medium">{fp.plan}</span> plan
                        </p>
                        {fp.created_at && (
                          <p className="text-xs text-gray-400">{format(new Date(fp.created_at), "MMM d, yyyy")}</p>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900 shrink-0">${parseFloat(fp.amount_paid || 0).toFixed(2)}</p>
                      <Badge variant="outline" className={STATUS_COLORS[fp.status] || ""}>
                        {fp.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User Email</Label>
              <Input className="mt-1.5" placeholder="user@email.com" value={form.user_email} onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plan</Label>
                <Select value={form.plan_name} onValueChange={v => setForm(f => ({ ...f, plan_name: v }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount ($)</Label>
                <Input className="mt-1.5" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Transaction ID</Label>
                <Input className="mt-1.5" placeholder="TXN-..." value={form.transaction_id} onChange={e => setForm(f => ({ ...f, transaction_id: e.target.value }))} />
              </div>
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
              onClick={() => createSubscription.mutate(form)}
              disabled={!form.user_email || createSubscription.isPending}
            >
              {createSubscription.isPending ? "Adding..." : "Add Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
