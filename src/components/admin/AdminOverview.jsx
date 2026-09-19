import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { format } from "date-fns";
import {
  ListChecks, Users, Flag, Eye, Clock, Megaphone, Star, CreditCard, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? "—"}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverview({ onNavigate }) {
  const { data: stats } = useQuery({
    queryKey: ["admin-overview-stats"],
    queryFn: async () => {
      const [listings, profiles, reports, messageReports] = await Promise.all([
        supabase.from("listings").select("id, title, status, views, is_featured, created_date"),
        supabase.from("profiles").select("id, role"),
        supabase.from("reports").select("id, status"),
        supabase.from("message_reports").select("id, status"),
      ]);

      const allListings = listings.data || [];
      const totalViews = allListings.reduce((s, l) => s + (l.views || 0), 0);
      const activeListings = allListings.filter(l => l.status === "active").length;
      const pendingListings = allListings.filter(l => l.status === "pending").length;
      const featuredListings = allListings.filter(l => l.is_featured).length;

      const allReports = [...(reports.data || []), ...(messageReports.data || [])];
      const pendingReports = allReports.filter(r => r.status === "pending").length;

      const totalUsers = (profiles.data || []).length;

      const recentListings = [...allListings]
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 5);

      return {
        totalListings: allListings.length,
        activeListings,
        pendingListings,
        featuredListings,
        totalViews,
        totalUsers,
        pendingReports,
        recentListings,
      };
    },
  });

  const quickLinks = [
    { label: "Review Pending Listings", icon: Clock, tab: "listings", count: stats?.pendingListings },
    { label: "Open Reports", icon: Flag, tab: "reports", count: stats?.pendingReports },
    { label: "Manage Users", icon: Users, tab: "users", count: stats?.totalUsers },
    { label: "Manage Ads", icon: Megaphone, tab: "ads" },
    { label: "Featured Listings", icon: Star, tab: "featured", count: stats?.featuredListings },
    { label: "Payments", icon: CreditCard, tab: "payments" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Listings" value={stats?.totalListings} icon={ListChecks} color="bg-blue-500" sub={`${stats?.activeListings || 0} active`} />
        <StatCard label="Pending Review" value={stats?.pendingListings} icon={Clock} color="bg-amber-500" sub="Needs approval" />
        <StatCard label="Total Users" value={stats?.totalUsers} icon={Users} color="bg-emerald-500" />
        <StatCard label="Total Views" value={stats?.totalViews?.toLocaleString()} icon={Eye} color="bg-[#D80621]" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        <StatCard label="Featured" value={stats?.featuredListings} icon={Star} color="bg-yellow-500" />
        <StatCard label="Open Reports" value={stats?.pendingReports} icon={Flag} color="bg-red-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map(({ label, icon: Icon, tab, count }) => (
              <button
                key={tab}
                onClick={() => onNavigate(tab)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {count !== undefined && count > 0 && (
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Recent Listings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats?.recentListings || []).map(listing => (
              <div key={listing.id} className="flex items-center justify-between py-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{listing.title || "Untitled"}</p>
                  <p className="text-xs text-gray-400">
                    {listing.created_date ? format(new Date(listing.created_date), "MMM d, yyyy") : "—"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    listing.status === "active" ? "text-green-700 border-green-200 bg-green-50" :
                    listing.status === "pending" ? "text-amber-700 border-amber-200 bg-amber-50" :
                    "text-gray-600 border-gray-200"
                  }
                >
                  {listing.status}
                </Badge>
              </div>
            ))}
            {!stats?.recentListings?.length && (
              <p className="text-sm text-gray-400 text-center py-4">No listings yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
