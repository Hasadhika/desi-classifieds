import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { eventsApi } from "@/api/eventsApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus, CalendarDays, MapPin, ChevronDown, ChevronUp,
  Trash2, Pencil, Clock, ShoppingBag, Briefcase, Users,
  CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
};

const TYPE_CONFIG = {
  sale: { label: "Yard / Garage Sale", icon: ShoppingBag },
  jobs_board: { label: "Jobs Board", icon: Briefcase },
  community: { label: "Community Event", icon: Users },
};

export default function MyEvents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const [deleteId, setDeleteId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["my-events", user?.email],
    queryFn: () => eventsApi.getMyEvents(user.email),
    enabled: !!user?.email,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => eventsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      toast.success("Event deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete event"),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Sign in to manage your events.</p>
          <Button
            className="bg-[#D80621] hover:bg-[#B00520]"
            onClick={() => navigate(createPageUrl("Login"))}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter min-h-screen bg-[#F8F8F8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">My Events</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage your events, sales, and job boards
            </p>
          </div>
          <Link to={createPageUrl("PostEvent")}>
            <Button className="bg-[#D80621] hover:bg-[#B00520] rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Post Event
            </Button>
          </Link>
        </div>

        {/* Status legend */}
        <div className="flex flex-wrap gap-3 mb-6">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${cfg.color}`}>
              <cfg.icon className="w-3.5 h-3.5" />
              {cfg.label}
            </div>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="font-semibold text-lg">No events yet</h3>
            <p className="text-gray-500 mt-1 text-sm">Post a yard sale, jobs board, or community event</p>
            <Link to={createPageUrl("PostEvent")}>
              <Button className="mt-4 bg-[#D80621] hover:bg-[#B00520] rounded-xl">
                Post Your First Event
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.pending;
              const typeCfg = TYPE_CONFIG[event.event_type] || TYPE_CONFIG.sale;
              const isExpanded = expandedId === event.id;

              return (
                <div key={event.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="p-4 flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                      <typeCfg.icon className="w-5 h-5 text-[#D80621]" />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-sm text-[#1A1A1A] truncate">{event.title}</h3>
                        <Badge className={`${statusCfg.color} text-[10px] shrink-0 flex items-center gap-1`}>
                          <statusCfg.icon className="w-3 h-3" />
                          {statusCfg.label}
                        </Badge>
                      </div>

                      <p className="text-xs text-gray-500 mb-1">{typeCfg.label}</p>

                      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                        {(event.event_date || event.event_time) && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {event.event_date ? format(new Date(event.event_date + "T00:00:00"), "MMM d, yyyy") : ""}
                            {event.event_time && ` • ${event.event_time}`}
                          </span>
                        )}
                        {(event.city || event.province) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[event.city, event.province].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>

                      {event.status === "rejected" && event.rejection_reason && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span><strong>Rejected:</strong> {event.rejection_reason}</span>
                        </div>
                      )}

                      {event.status === "pending" && (
                        <p className="mt-1.5 text-[11px] text-amber-600">
                          Under review — will appear in the home page marquee once approved
                        </p>
                      )}

                      {event.status === "approved" && (
                        <p className="mt-1.5 text-[11px] text-green-600">
                          Live on home page marquee ✓
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {event.status === "pending" && (
                        <Link to={`${createPageUrl("PostEvent")}?edit=${event.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#D80621]">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                      <button
                        onClick={() => setDeleteId(event.id)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {/* Expand/collapse items */}
                      {event.items?.length > 0 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : event.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded items */}
                  {isExpanded && event.items?.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        {event.event_type === "jobs_board" ? "Jobs Listed" : "Items Listed"} ({event.items.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {event.items.map((item, idx) => (
                          <div key={idx} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-[#1A1A1A]">{item.name}</span>
                              {item.price && (
                                <span className="text-sm font-semibold text-[#D80621]">{item.price}</span>
                              )}
                            </div>
                            {item.quantity && (
                              <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                            )}
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
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
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove your event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
