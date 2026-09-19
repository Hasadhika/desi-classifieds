import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Calendar, FileText, Mail, MessageCircle, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/shared/UserAvatar";
import ListingCard from "@/components/shared/ListingCard";

export default function UserProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const userEmail = urlParams.get("email");
  const [activeTab, setActiveTab] = useState("active");

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["userProfile", userEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userEmail,
  });

  const { data: listings = [], isLoading: loadingListings } = useQuery({
    queryKey: ["userListings", userEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('poster_email', userEmail)
        .order('created_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userEmail,
  });

  if (loadingProfile) {
    return (
      <div className="page-enter min-h-screen bg-[#F8F8F8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center gap-6">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile && !loadingListings && listings.length === 0) {
    return (
      <div className="page-enter min-h-screen bg-[#F8F8F8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <Link to={createPageUrl("Browse")} className="inline-flex items-center gap-2 text-gray-600 hover:text-[#D80621] mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to listings
          </Link>
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">User not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const fallbackProfile = profile || { email: userEmail, full_name: userEmail?.split('@')[0] || 'User', role: 'user', created_date: null };

  const activeListings = listings.filter(l => l.status === 'active');
  const soldListings = listings.filter(l => l.status === 'sold');
  const expiredListings = listings.filter(l => l.status === 'expired');

  const displayListings = activeTab === 'active' ? activeListings :
                          activeTab === 'sold' ? soldListings : expiredListings;

  return (
    <div className="page-enter min-h-screen bg-[#F8F8F8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link to={createPageUrl("Browse")} className="inline-flex items-center gap-2 text-gray-600 hover:text-[#D80621] mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to listings
        </Link>

        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <UserAvatar
                name={fallbackProfile.full_name}
                email={fallbackProfile.email}
                className="w-24 h-24 text-3xl shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-[#1A1A1A]">
                    {fallbackProfile.full_name || 'User'}
                  </h1>
                  {fallbackProfile.role === 'admin' && (
                    <Badge className="bg-[#D80621]">Admin</Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    {fallbackProfile.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Member since {fallbackProfile.created_date ? format(new Date(fallbackProfile.created_date), "MMMM d, yyyy") : "Recently"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    {activeListings.length} active listing{activeListings.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <Link to={createPageUrl("Messages") + `?to=${fallbackProfile.email}`}>
                  <Button className="bg-[#D80621] hover:bg-[#B00520] rounded-xl">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact User
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#1A1A1A]">Listings</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{listings.length} total</span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="active">
                Active ({activeListings.length})
              </TabsTrigger>
              <TabsTrigger value="sold">
                Sold ({soldListings.length})
              </TabsTrigger>
              <TabsTrigger value="expired">
                Expired ({expiredListings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loadingListings ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array(6).fill(0).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="aspect-video rounded-lg mb-3" />
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : displayListings.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No {activeTab} listings</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayListings.map(listing => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
