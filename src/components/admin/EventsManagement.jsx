import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsApi } from "@/api/eventsApi";
import { format } from "date-fns";
import {
  Search, CheckCircle, XCircle, Eye, Trash2,
  RefreshCw, CalendarDays, MapPin, ShoppingBag,
  Briefcase, Users, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STATUS_COLORS = {
  approved: "text-green-700 border-green-200 bg-green-50",
  pending:  "text-amber-700 border-amber-200 bg-amber-50",
  rejected: "text-red-700  border-red-200  bg-red-50",
};

const TYPE_CONFIG = {
  sale:       { label: "Yard Sale",       icon: ShoppingBag },
  jobs_board: { label: "Jobs Board",      icon: Briefcase },
  community:  { label: "Community Event", icon: Users },
};

export default function EventsManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [viewEvent, setViewEvent] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null); // { id, title }
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => eventsApi.getAll(),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, reason }) =>
      eventsApi.updateStatus(id, status, reason || null),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["approved-events"] });
      toast.success(status === "approved" ? "Event approved — now live on home page" : "Event rejected");
      setRejectDialog(null);
      setRejectionReason("");
    },
    onError: (err) => toast.error(err?.message || "Failed to update event"),
  });

  const deleteEvent = useMutation({
    mutationFn: (id) => eventsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["approved-events"] });
      toast.success("Event deleted");
    },
    onError: () => toast.error("Failed to delete event"),
  });

  const filtered = events.filter((e) => {
    const matchSearch =
      !search ||
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      e.city?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all:      events.length,
    pending:  events.filter((e) => e.status === "pending").length,
    approved: events.filter((e) => e.status === "approved").length,
    rejected: events.filter((e) => e.status === "rejected").length,
  };

  const handleApprove = (id) =>
    updateStatus.mutate({ id, status: "approved" });

  const handleRejectConfirm = () => {
    if (!rejectDialog) return;
    updateStatus.mutate({ id: rejectDialog.id, status: "rejected", reason: rejectionReason });
  };

  return (
    <div className="space-y-5">
      {/* Status counters */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(counts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === status
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-xl font-bold">{count}</p>
            <p className={`text-xs capitalize mt-0.5 ${statusFilter === status ? "text-gray-300" : "text-gray-500"}`}>
              {status === "all" ? "Total" : status}
            </p>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by title, email, city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No events found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((event) => {
                const typeCfg = TYPE_CONFIG[event.event_type] || TYPE_CONFIG.sale;
                const isExpanded = expandedId === event.id;

                return (
                  <div key={event.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Type icon */}
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <typeCfg.icon className="w-5 h-5 text-[#D80621]" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {event.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={`${STATUS_COLORS[event.status] || ""} text-[10px] shrink-0`}
                          >
                            {event.status}
                          </Badge>
                          <span className="text-xs text-gray-400 shrink-0">{typeCfg.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {event.user_email}
                          {event.city && ` • ${event.city}`}
                          {event.province && `, ${event.province}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          Submitted {format(new Date(event.created_at), "MMM d, yyyy")}
                          {event.event_date &&
                            ` • Event date: ${format(new Date(event.event_date + "T00:00:00"), "MMM d, yyyy")}`
                          }
                        </p>
                        {event.status === "rejected" && event.rejection_reason && (
                          <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {event.rejection_reason}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                          title="View details"
                          onClick={() => setViewEvent(event)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {event.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2"
                              title="Approve"
                              onClick={() => handleApprove(event.id)}
                              disabled={updateStatus.isPending}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                              title="Reject"
                              onClick={() => {
                                setRejectDialog({ id: event.id, title: event.title });
                                setRejectionReason("");
                              }}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {event.status === "approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                            title="Revoke approval"
                            onClick={() => setRejectDialog({ id: event.id, title: event.title })}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 px-2"
                          title="Delete"
                          onClick={() => deleteEvent.mutate(event.id)}
                          disabled={deleteEvent.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>

                        {event.items?.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-gray-600 h-8 px-2"
                            onClick={() => setExpandedId(isExpanded ? null : event.id)}
                          >
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4" />
                              : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded items */}
                    {isExpanded && event.items?.length > 0 && (
                      <div className="mt-3 ml-14 bg-gray-50 rounded-xl p-3">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          {event.event_type === "jobs_board" ? "Jobs" : "Items"} ({event.items.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {event.items.map((item, idx) => (
                            <div key={idx} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{item.name}</span>
                                {item.price && (
                                  <span className="text-sm font-semibold text-[#D80621]">{item.price}</span>
                                )}
                              </div>
                              {item.quantity && (
                                <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                              )}
                              {item.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── View Detail Dialog ─── */}
      <Dialog open={!!viewEvent} onOpenChange={() => setViewEvent(null)}>
        {viewEvent && (
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-6">{viewEvent.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Type</p>
                  <p className="font-medium">{TYPE_CONFIG[viewEvent.event_type]?.label || viewEvent.event_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
                  <Badge variant="outline" className={`${STATUS_COLORS[viewEvent.status] || ""} text-xs`}>
                    {viewEvent.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Posted by</p>
                  <p className="font-medium">{viewEvent.user_name || "—"}</p>
                  <p className="text-gray-500 text-xs">{viewEvent.user_email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Submitted</p>
                  <p className="font-medium">{format(new Date(viewEvent.created_at), "MMM d, yyyy")}</p>
                </div>
              </div>

              {viewEvent.description && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-gray-700 leading-relaxed">{viewEvent.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {viewEvent.event_date && (
                  <div className="flex items-start gap-2">
                    <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Date</p>
                      <p>{format(new Date(viewEvent.event_date + "T00:00:00"), "MMMM d, yyyy")}</p>
                      {viewEvent.event_end_date && viewEvent.event_end_date !== viewEvent.event_date && (
                        <p className="text-xs text-gray-500">
                          to {format(new Date(viewEvent.event_end_date + "T00:00:00"), "MMMM d, yyyy")}
                        </p>
                      )}
                      {viewEvent.event_time && <p className="text-xs text-gray-500">{viewEvent.event_time}</p>}
                    </div>
                  </div>
                )}
                {(viewEvent.city || viewEvent.address) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Location</p>
                      {viewEvent.address && <p>{viewEvent.address}</p>}
                      <p>{[viewEvent.city, viewEvent.province].filter(Boolean).join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>

              {viewEvent.items?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                    {viewEvent.event_type === "jobs_board" ? "Jobs Listed" : "Items for Sale"} ({viewEvent.items.length})
                  </p>
                  <div className="space-y-2">
                    {viewEvent.items.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.name}</span>
                          {item.price && (
                            <span className="font-semibold text-[#D80621]">{item.price}</span>
                          )}
                        </div>
                        {item.quantity && <span className="text-xs text-gray-400">Qty: {item.quantity}</span>}
                        {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewEvent.rejection_reason && (
                <div className="bg-red-50 rounded-xl px-3 py-2 text-red-700 text-xs">
                  <strong>Rejection reason:</strong> {viewEvent.rejection_reason}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline" className="rounded-xl">Close</Button>
              </DialogClose>
              {viewEvent.status === "pending" && (
                <>
                  <Button
                    className="bg-green-600 hover:bg-green-700 rounded-xl"
                    onClick={() => {
                      handleApprove(viewEvent.id);
                      setViewEvent(null);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-xl"
                    onClick={() => {
                      setViewEvent(null);
                      setRejectDialog({ id: viewEvent.id, title: viewEvent.title });
                      setRejectionReason("");
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ─── Reject Dialog ─── */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Event</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            You are rejecting: <strong>{rejectDialog?.title}</strong>
          </p>
          <div className="mt-2">
            <Label htmlFor="rejection-reason" className="text-sm">Reason (optional)</Label>
            <Textarea
              id="rejection-reason"
              className="mt-1 resize-none"
              rows={3}
              placeholder="Explain why this event is being rejected…"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 mt-2">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={handleRejectConfirm}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? "Rejecting…" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
