import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  ListChecks,
  Users,
  Flag,
  Megaphone,
  Star,
  CreditCard,
  ShieldCheck,
  FolderTree,
  LogOut,
  Menu,
  X,
  Settings,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CategoryManager from "@/components/admin/CategoryManager";
import UserManagement from "@/components/admin/UserManagement";
import PaymentsManagement from "@/components/admin/PaymentsManagement";
import ListingsManagement from "@/components/admin/ListingsManagement";
import ReportsManagement from "@/components/admin/ReportsManagement";
import AdsManagement from "@/components/admin/AdsManagement";
import FeaturedListingsManagement from "@/components/admin/FeaturedListingsManagement";
import ContentModeration from "@/components/admin/ContentModeration";
import AdminOverview from "@/components/admin/AdminOverview";
import PlatformSettings from "@/components/admin/PlatformSettings";
import EventsManagement from "@/components/admin/EventsManagement";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "listings", label: "Listings", icon: ListChecks },
  { id: "events", label: "Events & Sales", icon: CalendarDays },
  { id: "users", label: "Users", icon: Users },
  { id: "reports", label: "Reports & Spam", icon: Flag },
  { id: "moderation", label: "Content Moderation", icon: ShieldCheck },
  { id: "ads", label: "Advertisements", icon: Megaphone },
  { id: "featured", label: "Featured Listings", icon: Star },
  { id: "payments", label: "Payments & Subscriptions", icon: CreditCard },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "settings", label: "Platform Settings", icon: Settings },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: profileData } = useQuery({
    queryKey: ["admin-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate(createPageUrl("Login"));
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview": return <AdminOverview onNavigate={setActiveTab} />;
      case "listings": return <ListingsManagement />;
      case "events": return <EventsManagement />;
      case "users": return <UserManagement />;
      case "reports": return <ReportsManagement />;
      case "moderation": return <ContentModeration />;
      case "ads": return <AdsManagement />;
      case "featured": return <FeaturedListingsManagement />;
      case "payments": return <PaymentsManagement />;
      case "categories": return <CategoryManager />;
      case "settings": return <PlatformSettings />;
      default: return <AdminOverview onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside
        className={cn(
          "flex flex-col bg-gray-900 text-white transition-all duration-300 shrink-0",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#D80621] rounded-lg flex items-center justify-center text-white font-bold text-sm">DC</div>
              <span className="font-bold text-sm">Admin Panel</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors ml-auto"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === id
                  ? "bg-[#D80621] text-white"
                  : "text-gray-400 hover:bg-gray-700 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-700">
          {sidebarOpen && profileData && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-medium text-white truncate">{profileData.full_name}</p>
              <p className="text-xs text-gray-400 truncate">{profileData.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label ?? "Dashboard"}
            </h1>
            <p className="text-xs text-gray-500">DesiClassifieds Admin</p>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
