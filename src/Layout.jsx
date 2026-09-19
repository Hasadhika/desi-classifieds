import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { createCategoryUrl } from "@/utils/slugify";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import {
  Menu, X, Plus, Search, Heart, MessageSquare,
  ChevronDown, LogOut, FileText, Shield, Home, Megaphone, CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { toast } from "sonner";

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, logout } = useAuth();

  const navLinks = [
    { label: "Home", page: "Home", icon: Home },
    { label: "Browse", page: "Browse", icon: Search },
    { label: "Events & Sales", page: "PostEvent", icon: CalendarDays },
    { label: "Post Ad", page: "PostAd", icon: Plus, highlight: true },
  ];

  useEffect(() => {
    if (isAuthenticated && currentUser?.email) {
      fetchUnreadCount();

      const interval = setInterval(fetchUnreadCount, 30000);

      const channel = supabase
        .channel('messages-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          () => fetchUnreadCount()
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        channel.unsubscribe();
      };
    }
  }, [isAuthenticated, currentUser?.email]);

  const fetchUnreadCount = async () => {
    try {
      const { data, error } = await supabase.rpc('get_unread_message_count', {
        user_email_param: currentUser?.email
      });

      if (!error && data !== null) {
        setUnreadCount(data);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#D80621] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DC</span>
              </div>
              <span className="font-bold text-[#1A1A1A] text-lg tracking-tight hidden sm:block">
                Desi<span className="text-[#D80621]">Classifieds</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.page}
                  to={createPageUrl(link.page)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    link.highlight
                      ? "bg-[#D80621] text-white hover:bg-[#B00520]"
                      : currentPageName === link.page
                        ? "bg-gray-100 text-[#1A1A1A]"
                        : "text-gray-600 hover:text-[#1A1A1A] hover:bg-gray-50"
                  }`}
                >
                  {link.highlight && <Plus className="w-4 h-4 inline mr-1" />}
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Link to={createPageUrl("SavedListings")} className="p-2 rounded-lg text-gray-500 hover:text-[#D80621] hover:bg-gray-50 transition-colors hidden sm:flex">
                    <Heart className="w-5 h-5" />
                  </Link>
                  <Link to={createPageUrl("Messages")} className="p-2 rounded-lg text-gray-500 hover:text-[#D80621] hover:bg-gray-50 transition-colors hidden sm:flex relative">
                    <MessageSquare className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-[#D80621] hover:bg-[#D80621] text-xs flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full hover:bg-gray-50 transition-colors">
                        <UserAvatar
                          name={currentUser?.full_name}
                          email={currentUser?.email}
                          className="w-7 h-7"
                        />
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="font-medium text-sm truncate">{currentUser?.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                        <span className={`inline-block mt-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                          currentUser?.role === 'admin'
                            ? 'bg-red-100 text-red-700'
                            : currentUser?.role === 'paid_user'
                            ? 'bg-amber-100 text-amber-700'
                            : currentUser?.role === 'advertiser'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {currentUser?.role === 'admin' ? 'Admin'
                            : currentUser?.role === 'paid_user' ? 'Paid User'
                            : currentUser?.role === 'advertiser' ? 'Advertiser'
                            : 'User'}
                        </span>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("MyAds")} className="flex items-center gap-2">
                          <FileText className="w-4 h-4" /> My Ads
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("SavedListings")} className="flex items-center gap-2">
                          <Heart className="w-4 h-4" /> Saved
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("Messages")} className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" /> Messages
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("MyPromotions")} className="flex items-center gap-2">
                          <Megaphone className="w-4 h-4" /> My Promotions
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("MyEvents")} className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4" /> My Events
                        </Link>
                      </DropdownMenuItem>
                      {currentUser?.role === "admin" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl("AdminDashboard")} className="flex items-center gap-2">
                              <Shield className="w-4 h-4" /> Admin
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={async () => {
                        try {
                          await logout();
                          toast.success("Signed out successfully");
                          navigate(createPageUrl("Home"));
                        } catch (error) {
                          toast.error("Failed to sign out");
                        }
                      }} className="flex items-center gap-2 text-red-600">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Link to={createPageUrl("Login")}>
                  <Button
                    variant="outline"
                    className="rounded-xl text-sm font-medium"
                  >
                    Sign In
                  </Button>
                </Link>
              )}

              {/* Mobile menu button */}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.page}
                to={createPageUrl(link.page)}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  currentPageName === link.page ? "bg-red-50 text-[#D80621]" : "text-gray-600"
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <>
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <Link to={createPageUrl("MyAds")} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600">
                    <FileText className="w-4 h-4" /> My Ads
                  </Link>
                  <Link to={createPageUrl("SavedListings")} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600">
                    <Heart className="w-4 h-4" /> Saved
                  </Link>
                  <Link to={createPageUrl("Messages")} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600">
                    <MessageSquare className="w-4 h-4" /> Messages
                  </Link>
                  <Link to={createPageUrl("MyPromotions")} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600">
                    <Megaphone className="w-4 h-4" /> My Promotions
                  </Link>
                  <Link to={createPageUrl("MyEvents")} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600">
                    <CalendarDays className="w-4 h-4" /> My Events
                  </Link>
                  {currentUser?.role === 'admin' && (
                    <Link to={createPageUrl("AdminDashboard")} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 font-medium">
                      <Shield className="w-4 h-4" /> Admin Dashboard
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#D80621] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">DC</span>
                </div>
                <span className="font-bold text-lg">DesiClassifieds</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Canada's trusted platform for the South Asian community. Find rooms, jobs, services, and more.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Popular</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to={createCategoryUrl("real_estate")} className="hover:text-white transition-colors">Rooms & Rentals</Link></li>
                <li><Link to={createCategoryUrl("jobs")} className="hover:text-white transition-colors">Jobs</Link></li>
                <li><Link to={createCategoryUrl("services")} className="hover:text-white transition-colors">Services</Link></li>
                <li><Link to={createCategoryUrl("vehicles")} className="hover:text-white transition-colors">Vehicles</Link></li>
                <li><Link to={createCategoryUrl("buy_sell")} className="hover:text-white transition-colors">Buy & Sell</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Top Cities</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to={createCategoryUrl("real_estate", "Ontario")} className="hover:text-white transition-colors">Toronto / GTA</Link></li>
                <li><Link to={createCategoryUrl("real_estate", "British Columbia")} className="hover:text-white transition-colors">Vancouver</Link></li>
                <li><Link to={createCategoryUrl("real_estate", "Alberta")} className="hover:text-white transition-colors">Calgary</Link></li>
                <li><Link to={createCategoryUrl("real_estate", "Quebec")} className="hover:text-white transition-colors">Montreal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><span className="hover:text-white transition-colors cursor-pointer">About Us</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Safety Tips</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">© 2026 DesiClassifieds.ca — All rights reserved.</p>
            <p className="text-xs text-gray-500">Made with ❤️ for the Desi community in Canada</p>
          </div>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      {currentPageName !== "PostAd" && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
          <Link to={createPageUrl("PostAd")}>
            <Button className="w-full h-12 bg-[#D80621] hover:bg-[#B00520] text-white rounded-2xl font-semibold shadow-xl shadow-red-900/30">
              <Plus className="w-5 h-5 mr-2" />
              Post Free Ad
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}