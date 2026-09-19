import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { format } from "date-fns";
import {
  Flag, MessageSquare, CheckCircle, XCircle,
  RefreshCw, Ban, Trash2, AlertTriangle, UserX, UserCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const STATUS_COLORS = {
  pending: "text-amber-700 border-amber-200 bg-amber-50",
  reviewed: "text-blue-700 border-blue-200 bg-blue-50",
  resolved: "text-green-700 border-green-200 bg-green-50",
};

function ErrorBox({ message }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 m-4">
      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-700">Failed to load reports</p>
        <p className="text-xs text-red-600 mt-1 font-mono whitespace-pre-wrap">{message}</p>
      </div>
    </div>
  );
}

function ListingReportRow({ report, onResolve, onDismiss, onRemoveListing, onDelete }) {
  return (
    <div className="px-5 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-gray-900 capitalize">
              {report.reason?.replace(/_/g, " ")}
            </p>
            <Badge variant="outline" className={STATUS_COLORS[report.status] || ""}>
              {report.status}
            </Badge>
          </div>
          {report.listing && (
            <p className="text-xs font-medium text-gray-700 mb-0.5">
              Listing: <span className="text-[#D80621]">{report.listing.title}</span>
              {report.listing.poster_email && (
                <span className="text-gray-400 ml-1">by {report.listing.poster_email}</span>
              )}
              {report.listing.status === "rejected" && (
                <Badge variant="outline" className="ml-2 text-red-600 border-red-200 bg-red-50 text-[10px]">
                  Removed
                </Badge>
              )}
            </p>
          )}
          {report.listing_id && !report.listing && (
            <p className="text-xs text-gray-400 mb-0.5">Listing ID: {report.listing_id}</p>
          )}
          {report.details && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{report.details}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Reported by: <span className="font-medium">{report.reporter_email}</span>
            {(report.created_date || report.created_at) && (
              <> &bull; {format(new Date(report.created_date || report.created_at), "MMM d, yyyy")}</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {report.status === "pending" && (
            <>
              {(!report.listing || report.listing.status !== "rejected") && report.listing_id && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-orange-600 hover:bg-orange-50 h-8 px-2 text-xs gap-1"
                  onClick={() => onRemoveListing(report.listing_id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-green-600 hover:bg-green-50 h-8 px-2"
                title="Mark resolved"
                onClick={() => onResolve(report.id)}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:bg-gray-100 h-8 px-2"
                title="Dismiss"
                onClick={() => onDismiss(report.id)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
          {/* Delete report button — always visible */}
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:bg-red-50 h-8 px-2"
            title="Delete report"
            onClick={() => onDelete(report.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageReportRow({ report, onResolve, onDismiss, onBlockUser, onDelete }) {
  const senderEmail = report.message?.sender_email;
  return (
    <div className="px-5 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-gray-900 capitalize">
              {report.reason?.replace(/_/g, " ")}
            </p>
            <Badge variant="outline" className={STATUS_COLORS[report.status] || ""}>
              {report.status}
            </Badge>
          </div>
          {report.message && (
            <p className="text-xs font-medium text-gray-700 mb-0.5">
              From: <span className="text-[#D80621]">{report.message.sender_name || report.message.sender_email}</span>
              {report.message.sender_email && (
                <span className="text-gray-400 ml-1">({report.message.sender_email})</span>
              )}
            </p>
          )}
          {report.message?.content && (
            <p className="text-xs text-gray-500 italic line-clamp-1 mb-0.5">
              "{report.message.content}"
            </p>
          )}
          {report.message_id && !report.message && (
            <p className="text-xs text-gray-400 mb-0.5">Message ID: {report.message_id}</p>
          )}
          {report.details && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{report.details}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Reported by: <span className="font-medium">{report.reporter_email}</span>
            {report.created_at && (
              <> &bull; {format(new Date(report.created_at), "MMM d, yyyy")}</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {report.status === "pending" && (
            <>
              {senderEmail && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 h-8 px-2 text-xs gap-1"
                  onClick={() => onBlockUser(senderEmail)}
                >
                  <Ban className="w-3.5 h-3.5" />
                  Block User
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-green-600 hover:bg-green-50 h-8 px-2"
                title="Mark resolved"
                onClick={() => onResolve(report.id)}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:bg-gray-100 h-8 px-2"
                title="Dismiss"
                onClick={() => onDismiss(report.id)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
          {/* Delete report button — always visible */}
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:bg-red-50 h-8 px-2"
            title="Delete report"
            onClick={() => onDelete(report.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function BannedUserRow({ user, onUnban }) {
  return (
    <div className="px-5 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <UserX className="w-4 h-4 text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user.full_name || "—"}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            {user.created_date && (
              <p className="text-xs text-gray-400 mt-0.5">
                Banned since {format(new Date(user.created_date), "MMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 border-green-200 hover:bg-green-50 h-8 px-3 text-xs gap-1.5 shrink-0"
          onClick={() => onUnban(user.email)}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Unban User
        </Button>
      </div>
    </div>
  );
}

export default function ReportsManagement() {
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, payload: null });

  // ── Listing Reports ──────────────────────────────────────────────────
  const {
    data: listingReports = [],
    isLoading: loadingListingReports,
    isError: listingReportsError,
    error: listingReportsErrorMsg,
  } = useQuery({
    queryKey: ["admin-listing-reports"],
    queryFn: async () => {
      const { data: reports, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_date", { ascending: false });

      const rows = error
        ? await supabase.from("reports").select("*").then(r => {
            if (r.error) throw new Error(r.error.message);
            return r.data || [];
          })
        : reports || [];

      if (!rows.length) return [];
      const ids = [...new Set(rows.map(r => r.listing_id).filter(Boolean))];
      if (!ids.length) return rows;
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, status, poster_email")
        .in("id", ids);
      const map = {};
      (listings || []).forEach(l => { map[l.id] = l; });
      return rows.map(r => ({ ...r, listing: map[r.listing_id] || null }));
    },
    retry: false,
  });

  // ── Banned Users ─────────────────────────────────────────────────────
  // Uses SECURITY DEFINER RPC to bypass RLS on profiles table
  const {
    data: bannedUsers = [],
    isLoading: loadingBanned,
  } = useQuery({
    queryKey: ["admin-banned-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_banned_users");
      if (error) throw error;
      return data || [];
    },
  });

  // ── Message Reports ──────────────────────────────────────────────────
  const {
    data: messageReports = [],
    isLoading: loadingMessageReports,
    isError: messageReportsError,
    error: messageReportsErrorMsg,
  } = useQuery({
    queryKey: ["admin-message-reports"],
    queryFn: async () => {
      const { data: reports, error } = await supabase
        .from("message_reports")
        .select("*")
        .order("created_at", { ascending: false });

      const rows = error
        ? await supabase.from("message_reports").select("*").then(r => {
            if (r.error) throw new Error(r.error.message);
            return r.data || [];
          })
        : reports || [];

      if (!rows.length) return [];
      const ids = [...new Set(rows.map(r => r.message_id).filter(Boolean))];
      if (!ids.length) return rows;
      const { data: messages } = await supabase
        .from("messages")
        .select("id, content, sender_email, sender_name")
        .in("id", ids);
      const map = {};
      (messages || []).forEach(m => { map[m.id] = m; });
      return rows.map(r => ({ ...r, message: map[r.message_id] || null }));
    },
    retry: false,
  });

  // ── Mutations ────────────────────────────────────────────────────────

  const updateReport = useMutation({
    mutationFn: async ({ table, id, status }) => {
      const { error } = await supabase.from(table).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listing-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-message-reports"] });
      toast.success("Report updated");
    },
    onError: (e) => toast.error("Failed to update: " + e.message),
  });

  // Uses SECURITY DEFINER RPC to bypass infinite recursion in profiles RLS
  const removeListingMutation = useMutation({
    mutationFn: async (listingId) => {
      const { error } = await supabase.rpc("remove_listing_admin", {
        p_listing_id: listingId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listing-reports"] });
      queryClient.invalidateQueries({ queryKey: ["listings-recent"] });
      queryClient.invalidateQueries({ queryKey: ["browse-listings"] });
      toast.success("Listing removed from homepage");
    },
    onError: (e) => toast.error("Failed to remove listing: " + e.message),
  });

  // Uses SECURITY DEFINER RPC to bypass infinite recursion in profiles RLS
  const blockUserMutation = useMutation({
    mutationFn: async (email) => {
      const { error } = await supabase.rpc("block_user_by_email", {
        user_email: email,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User has been blocked successfully");
    },
    onError: (e) => toast.error("Failed to block user: " + e.message),
  });

  // Unban user — sets role back to 'user' via SECURITY DEFINER RPC
  const unbanUserMutation = useMutation({
    mutationFn: async (email) => {
      const { error } = await supabase.rpc("unban_user_by_email", {
        user_email: email,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banned-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User has been unbanned successfully");
    },
    onError: (e) => toast.error("Failed to unban user: " + e.message),
  });

  // Delete listing report via SECURITY DEFINER RPC
  const deleteListingReportMutation = useMutation({
    mutationFn: async (reportId) => {
      const { error } = await supabase.rpc("delete_listing_report", {
        p_report_id: reportId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listing-reports"] });
      toast.success("Report deleted");
    },
    onError: (e) => toast.error("Failed to delete report: " + e.message),
  });

  // Delete message report via SECURITY DEFINER RPC
  const deleteMessageReportMutation = useMutation({
    mutationFn: async (reportId) => {
      const { error } = await supabase.rpc("delete_message_report", {
        p_report_id: reportId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-message-reports"] });
      toast.success("Report deleted");
    },
    onError: (e) => toast.error("Failed to delete report: " + e.message),
  });

  const handleConfirm = () => {
    const { type, payload } = confirmDialog;
    if (type === "remove") removeListingMutation.mutate(payload);
    else if (type === "block") blockUserMutation.mutate(payload);
    else if (type === "unban") unbanUserMutation.mutate(payload);
    else if (type === "delete-listing") deleteListingReportMutation.mutate(payload);
    else if (type === "delete-message") deleteMessageReportMutation.mutate(payload);
    setConfirmDialog({ open: false, type: null, payload: null });
  };

  const pendingListing = listingReports.filter(r => r.status === "pending").length;
  const pendingMessage = messageReports.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-gray-900">
              {listingReports.length + messageReports.length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-600">
              {listingReports.length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Listing Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">
              {messageReports.length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Message Reports</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="listings">
            <div className="px-5 pt-4">
              <TabsList>
                <TabsTrigger value="listings" className="gap-1.5">
                  <Flag className="w-3.5 h-3.5" />
                  Listing Reports
                  {pendingListing > 0 && (
                    <Badge variant="destructive" className="text-xs ml-1 h-4 px-1">
                      {pendingListing}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="messages" className="gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message Reports
                  {pendingMessage > 0 && (
                    <Badge variant="destructive" className="text-xs ml-1 h-4 px-1">
                      {pendingMessage}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="banned" className="gap-1.5">
                  <UserX className="w-3.5 h-3.5" />
                  Banned Users
                  {bannedUsers.length > 0 && (
                    <Badge className="bg-red-100 text-red-700 text-xs ml-1 h-4 px-1">
                      {bannedUsers.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Listing Reports Tab */}
            <TabsContent value="listings" className="mt-0">
              <div className="divide-y">
                {loadingListingReports ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : listingReportsError ? (
                  <ErrorBox message={listingReportsErrorMsg?.message || "Unknown error"} />
                ) : listingReports.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Flag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No listing reports</p>
                    <p className="text-xs mt-1 text-gray-300">
                      Reports will appear here when users flag listings
                    </p>
                  </div>
                ) : (
                  listingReports.map(report => (
                    <ListingReportRow
                      key={report.id}
                      report={report}
                      onResolve={id =>
                        updateReport.mutate({ table: "reports", id, status: "resolved" })
                      }
                      onDismiss={id =>
                        updateReport.mutate({ table: "reports", id, status: "reviewed" })
                      }
                      onRemoveListing={listingId =>
                        setConfirmDialog({ open: true, type: "remove", payload: listingId })
                      }
                      onDelete={id =>
                        setConfirmDialog({ open: true, type: "delete-listing", payload: id })
                      }
                    />
                  ))
                )}
              </div>
            </TabsContent>

            {/* Message Reports Tab */}
            <TabsContent value="messages" className="mt-0">
              <div className="divide-y">
                {loadingMessageReports ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : messageReportsError ? (
                  <ErrorBox message={messageReportsErrorMsg?.message || "Unknown error"} />
                ) : messageReports.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No message reports</p>
                    <p className="text-xs mt-1 text-gray-300">
                      Reports will appear here when users flag messages
                    </p>
                  </div>
                ) : (
                  messageReports.map(report => (
                    <MessageReportRow
                      key={report.id}
                      report={report}
                      onResolve={id =>
                        updateReport.mutate({ table: "message_reports", id, status: "resolved" })
                      }
                      onDismiss={id =>
                        updateReport.mutate({ table: "message_reports", id, status: "reviewed" })
                      }
                      onBlockUser={email =>
                        setConfirmDialog({ open: true, type: "block", payload: email })
                      }
                      onDelete={id =>
                        setConfirmDialog({ open: true, type: "delete-message", payload: id })
                      }
                    />
                  ))
                )}
              </div>
            </TabsContent>
            {/* Banned Users Tab */}
            <TabsContent value="banned" className="mt-0">
              <div className="divide-y">
                {loadingBanned ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : bannedUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <UserX className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No banned users</p>
                    <p className="text-xs mt-1 text-gray-300">Blocked users will appear here</p>
                  </div>
                ) : (
                  bannedUsers.map(user => (
                    <BannedUserRow
                      key={user.id || user.email}
                      user={user}
                      onUnban={email =>
                        setConfirmDialog({ open: true, type: "unban", payload: email })
                      }
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={open => !open && setConfirmDialog({ open: false, type: null, payload: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === "remove" && "Remove Listing?"}
              {confirmDialog.type === "block" && "Block User?"}
              {confirmDialog.type === "unban" && "Unban User?"}
              {(confirmDialog.type === "delete-listing" || confirmDialog.type === "delete-message") && "Delete Report?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === "remove" &&
                "This will hide the listing from the homepage and mark it as rejected. This cannot be undone easily."}
              {confirmDialog.type === "block" &&
                `Block ${confirmDialog.payload} from accessing the website? Their role will be set to 'banned'.`}
              {confirmDialog.type === "unban" &&
                `Restore access for ${confirmDialog.payload}? Their account will be reactivated and they can log in again.`}
              {(confirmDialog.type === "delete-listing" || confirmDialog.type === "delete-message") &&
                "This will permanently delete this report. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmDialog.type === "unban"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"}
            >
              {confirmDialog.type === "remove" && "Remove Listing"}
              {confirmDialog.type === "block" && "Block User"}
              {confirmDialog.type === "unban" && "Yes, Unban"}
              {(confirmDialog.type === "delete-listing" || confirmDialog.type === "delete-message") && "Delete Report"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
