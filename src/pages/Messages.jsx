import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import {
  Send, ArrowLeft, MessageSquare, Heart, Flag, Trash2,
  Image as ImageIcon, MapPin, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/shared/UserAvatar";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { staticMapUrl } from "@/utils/googleMapsLoader";

export default function Messages() {
  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get("listing");
  const toEmail = urlParams.get("to");
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [shareLocation, setShareLocation] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [messageToReport, setMessageToReport] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ["messages", currentUser?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, message_reactions(*)")
        .or(`sender_email.eq.${currentUser.email},receiver_email.eq.${currentUser.email}`)
        .is("deleted_at", null)
        .order("created_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.email,
  });

  const conversations = React.useMemo(() => {
    const convos = {};
    allMessages.forEach(msg => {
      const key = msg.conversation_id;
      if (!convos[key]) convos[key] = { id: key, messages: [], listing_id: msg.listing_id, otherParty: "", otherEmail: "" };
      convos[key].messages.push(msg);
    });
    Object.values(convos).forEach(c => {
      c.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      const otherMsg = c.messages.find(m => m.sender_email !== currentUser?.email);
      c.otherParty = otherMsg?.sender_name || otherMsg?.sender_email || "Unknown";
      c.otherEmail = otherMsg?.sender_email || "";
      c.lastMessage = c.messages[c.messages.length - 1];
      const unreadInConvo = c.messages.filter(m => m.receiver_email === currentUser?.email && !m.is_read).length;
      c.unreadCount = unreadInConvo;
    });
    return Object.values(convos).sort((a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date));
  }, [allMessages, currentUser]);

  useEffect(() => {
    if (listingId && toEmail && currentUser && !selectedConvo) {
      const convoId = [currentUser.email, toEmail, listingId].sort().join("_");
      const existing = conversations.find(c => c.id === convoId);
      if (existing) {
        setSelectedConvo(existing);
      } else {
        setSelectedConvo({ id: convoId, messages: [], listing_id: listingId, otherParty: toEmail, otherEmail: toEmail });
      }
    }
  }, [listingId, toEmail, currentUser, conversations]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selectedConvo?.messages]);

  useEffect(() => {
    if (selectedConvo) {
      markMessagesAsRead();
    }
  }, [selectedConvo]);

  const markMessagesAsRead = async () => {
    if (!selectedConvo) return;
    const unreadIds = selectedConvo.messages
      .filter(m => m.receiver_email === currentUser?.email && !m.is_read)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .in("id", unreadIds);
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `message-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('listing-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
        (error) => reject(error)
      );
    });
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      const receiverEmail = selectedConvo.otherEmail || selectedConvo.otherParty;
      let attachmentUrl = null;
      let attachmentType = null;
      let locationData = null;

      if (imageFile) {
        attachmentUrl = await uploadImage(imageFile);
        attachmentType = 'image';
      } else if (shareLocation) {
        const coords = await getCurrentLocation();
        locationData = coords;
        attachmentType = 'location';
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          listing_id: selectedConvo.listing_id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name || currentUser.email,
          receiver_email: receiverEmail,
          content: newMessage || (attachmentType === 'image' ? 'Sent an image' : 'Shared location'),
          conversation_id: selectedConvo.id,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          location_data: locationData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setNewMessage("");
      setImageFile(null);
      setImagePreview(null);
      setShareLocation(false);
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
    }
  });

  const toggleReaction = async (messageId, hasLiked) => {
    try {
      if (hasLiked) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_email", currentUser.email);
      } else {
        await supabase
          .from("message_reactions")
          .insert({
            message_id: messageId,
            user_email: currentUser.email,
            reaction_type: 'like'
          });
      }
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    } catch (error) {
      toast.error("Failed to update reaction");
    }
  };

  const handleReportMessage = async () => {
    if (!reportReason.trim()) {
      toast.error("Please select a reason");
      return;
    }

    try {
      await supabase
        .from("message_reports")
        .insert({
          message_id: messageToReport.id,
          reporter_email: currentUser.email,
          reason: reportReason,
          details: reportDetails
        });

      toast.success("Message reported successfully");
      setReportDialogOpen(false);
      setMessageToReport(null);
      setReportReason("");
      setReportDetails("");
    } catch (error) {
      toast.error("Failed to report message");
    }
  };

  const handleDeleteConversation = async () => {
    try {
      const messageIds = selectedConvo.messages.map(m => m.id);

      await supabase
        .from("messages")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser.email
        })
        .in("id", messageIds);

      toast.success("Conversation deleted");
      setDeleteDialogOpen(false);
      setSelectedConvo(null);
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Please log in to view messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter min-h-[calc(100vh-80px)] bg-[#F8F8F8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-6">Messages</h1>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex" style={{ height: "70vh" }}>
          <div className={`w-full sm:w-80 border-r border-gray-100 overflow-y-auto ${selectedConvo ? "hidden sm:block" : ""}`}>
            {isLoading ? (
              <div className="p-4 space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No conversations yet</div>
            ) : (
              conversations.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConvo(convo)}
                  className={`w-full p-4 flex items-center gap-3 text-left border-b border-gray-50 transition-colors hover:bg-gray-50 ${selectedConvo?.id === convo.id ? "bg-red-50" : ""}`}
                >
                  <UserAvatar
                    name={convo.otherParty}
                    email={convo.otherEmail}
                    className="w-10 h-10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-[#1A1A1A] truncate">{convo.otherParty}</p>
                      {convo.unreadCount > 0 && (
                        <span className="bg-[#D80621] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{convo.lastMessage?.content}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {convo.lastMessage?.created_date ? format(new Date(convo.lastMessage.created_date), "MMM d") : ""}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className={`flex-1 flex flex-col ${!selectedConvo ? "hidden sm:flex" : "flex"}`}>
            {selectedConvo ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedConvo(null)} className="sm:hidden">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <UserAvatar
                      name={selectedConvo.otherParty}
                      email={selectedConvo.otherEmail}
                      className="w-8 h-8"
                    />
                    <p className="font-medium text-sm">{selectedConvo.otherParty}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedConvo.messages.map((msg, i) => {
                    const isMine = msg.sender_email === currentUser.email;
                    const hasLiked = msg.message_reactions?.some(r => r.user_email === currentUser.email);
                    const likeCount = msg.message_reactions?.length || 0;

                    return (
                      <div key={msg.id || i} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[75%] group">
                          <div className={`px-4 py-2.5 rounded-2xl ${
                            isMine
                              ? "bg-[#D80621] text-white rounded-br-md"
                              : "bg-gray-100 text-[#1A1A1A] rounded-bl-md"
                          }`}>
                            {msg.attachment_type === 'image' && msg.attachment_url && (
                              <img
                                src={msg.attachment_url}
                                alt="Shared"
                                className="rounded-lg mb-2 max-w-full h-auto max-h-64 object-cover"
                              />
                            )}
                            {msg.attachment_type === 'location' && msg.location_data && (() => {
                              const { lat, lng } = msg.location_data;
                              const imgUrl = staticMapUrl(lat, lng, 14, 300, 160);
                              const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                              return (
                                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block mb-2 group">
                                  {imgUrl ? (
                                    <div className="relative rounded-xl overflow-hidden">
                                      <img
                                        src={imgUrl}
                                        alt="Shared location"
                                        className="w-full h-36 object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-end">
                                        <div className={`w-full px-3 py-2 flex items-center gap-2 text-xs font-medium ${isMine ? 'text-white' : 'text-gray-700'}`}>
                                          <MapPin className="w-3.5 h-3.5 text-red-500" />
                                          Tap to open in Google Maps
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 underline">
                                      <MapPin className="w-4 h-4" />
                                      View location
                                    </div>
                                  )}
                                </a>
                              );
                            })()}
                            <p className="text-sm">{msg.content}</p>
                            <div className="flex items-center justify-between mt-1 gap-2">
                              <p className={`text-[10px] ${isMine ? "text-white/60" : "text-gray-400"}`}>
                                {msg.created_date ? format(new Date(msg.created_date), "h:mm a") : ""}
                              </p>
                              {likeCount > 0 && (
                                <span className={`text-[10px] flex items-center gap-1 ${isMine ? "text-white/80" : "text-gray-600"}`}>
                                  <Heart className="w-3 h-3 fill-current" /> {likeCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? "justify-end" : "justify-start"}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => toggleReaction(msg.id, hasLiked)}
                            >
                              <Heart className={`w-3 h-3 ${hasLiked ? "fill-red-500 text-red-500" : ""}`} />
                            </Button>
                            {!isMine && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => {
                                  setMessageToReport(msg);
                                  setReportDialogOpen(true);
                                }}
                              >
                                <Flag className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-gray-100">
                  {imagePreview && (
                    <div className="mb-2 relative inline-block">
                      <img src={imagePreview} alt="Preview" className="h-20 rounded-lg" />
                      <button
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShareLocation(!shareLocation)}
                      title={shareLocation ? "Cancel location sharing" : "Share your current location (shows map preview)"}
                      className={`shrink-0 ${shareLocation ? 'bg-blue-50 border-blue-500 text-blue-600' : ''}`}
                    >
                      <MapPin className="w-4 h-4" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (newMessage.trim() || imageFile || shareLocation) && sendMutation.mutate()}
                      className="rounded-xl"
                    />
                    <Button
                      onClick={() => (newMessage.trim() || imageFile || shareLocation) && sendMutation.mutate()}
                      className="bg-[#D80621] hover:bg-[#B00520] rounded-xl px-4"
                      disabled={!newMessage.trim() && !imageFile && !shareLocation}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all messages in this conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Message</DialogTitle>
            <DialogDescription>
              Help us understand what's wrong with this message
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-lg"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="">Select a reason</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="scam">Scam or fraud</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Additional details (optional)</Label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide more context..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReportMessage} className="bg-[#D80621] hover:bg-[#B00520]">
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
