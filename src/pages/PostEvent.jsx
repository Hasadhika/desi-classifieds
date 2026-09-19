import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { eventsApi } from "@/api/eventsApi";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, CalendarDays, MapPin, Tag, AlignLeft, Briefcase, ShoppingBag, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CANADIAN_PROVINCES = [
  "Ontario", "British Columbia", "Alberta", "Quebec",
  "Manitoba", "Saskatchewan", "Nova Scotia", "New Brunswick",
  "Newfoundland and Labrador", "Prince Edward Island",
];

const EVENT_TYPES = [
  { value: "sale", label: "Yard / Garage Sale", icon: ShoppingBag, description: "Sell multiple items at once" },
  { value: "jobs_board", label: "Jobs Board", icon: Briefcase, description: "Post multiple job openings" },
  { value: "community", label: "Community Event", icon: Users, description: "Cultural or community gathering" },
];

const emptyItem = () => ({ name: "", price: "", quantity: "", description: "" });

export default function PostEvent() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "sale",
    event_date: "",
    event_end_date: "",
    event_time: "",
    address: "",
    city: "",
    province: "",
  });
  const [items, setItems] = useState([emptyItem()]);

  const createMutation = useMutation({
    mutationFn: (payload) => eventsApi.create(payload),
    onSuccess: () => {
      toast.success("Event submitted! Awaiting admin approval.");
      navigate(createPageUrl("MyEvents"));
    },
    onError: (err) => toast.error(err?.message || "Failed to submit event"),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">You need to sign in to post an event.</p>
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

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setItemField = (index, key, value) =>
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [key]: value } : item));

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.event_type) return toast.error("Select an event type");
    const cleanItems = items.filter((item) => item.name.trim());
    createMutation.mutate({
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      ...form,
      event_date:     form.event_date     || null,
      event_end_date: form.event_end_date || null,
      items: cleanItems,
    });
  };

  const selectedType = EVENT_TYPES.find((t) => t.value === form.event_type);

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <span
              className="hover:text-[#D80621] cursor-pointer"
              onClick={() => navigate(createPageUrl("Home"))}
            >
              Home
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#1A1A1A] font-medium">Post Event / Sale</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Post an Event or Sale</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Announce a yard sale, jobs board, or community event. After admin approval it will appear on the home page marquee.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Type */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#D80621]" /> Event Type
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EVENT_TYPES.map((type) => (
                <button
                  type="button"
                  key={type.value}
                  onClick={() => setField("event_type", type.value)}
                  className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all ${
                    form.event_type === type.value
                      ? "border-[#D80621] bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <type.icon className={`w-5 h-5 ${form.event_type === type.value ? "text-[#D80621]" : "text-gray-500"}`} />
                  <span className={`font-medium text-sm ${form.event_type === type.value ? "text-[#D80621]" : "text-[#1A1A1A]"}`}>
                    {type.label}
                  </span>
                  <span className="text-xs text-gray-500">{type.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-[#D80621]" /> Basic Info
            </h2>
            <div>
              <Label htmlFor="title">
                {selectedType?.value === "jobs_board" ? "Board Title" : "Event Title"} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                className="mt-1"
                placeholder={
                  selectedType?.value === "jobs_board"
                    ? "e.g. Hiring: IT & Restaurant Staff – Toronto"
                    : "e.g. Weekend Yard Sale – Brampton"
                }
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="mt-1 resize-none"
                rows={4}
                placeholder="Describe the event, what's available, any special instructions..."
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                maxLength={1000}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/1000</p>
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#D80621]" /> Date &amp; Time
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event_date">Start Date</Label>
                <Input
                  id="event_date"
                  type="date"
                  className="mt-1"
                  value={form.event_date}
                  onChange={(e) => setField("event_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="event_end_date">End Date (optional)</Label>
                <Input
                  id="event_end_date"
                  type="date"
                  className="mt-1"
                  value={form.event_end_date}
                  onChange={(e) => setField("event_end_date", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="event_time">Time (e.g. 9:00 AM – 3:00 PM)</Label>
              <Input
                id="event_time"
                className="mt-1"
                placeholder="9:00 AM – 3:00 PM"
                value={form.event_time}
                onChange={(e) => setField("event_time", e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D80621]" /> Location
            </h2>
            <div>
              <Label htmlFor="address">Street Address (optional)</Label>
              <Input
                id="address"
                className="mt-1"
                placeholder="123 Main St"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                <Input
                  id="city"
                  className="mt-1"
                  placeholder="Brampton"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="province">Province <span className="text-red-500">*</span></Label>
                <Select value={form.province} onValueChange={(v) => setField("province", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANADIAN_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Items / Listings */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
                {selectedType?.value === "jobs_board"
                  ? <><Briefcase className="w-4 h-4 text-[#D80621]" /> Jobs to Post</>
                  : <><ShoppingBag className="w-4 h-4 text-[#D80621]" /> Items for Sale</>
                }
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="rounded-xl text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add {selectedType?.value === "jobs_board" ? "Job" : "Item"}
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {selectedType?.value === "jobs_board" ? `Job #${index + 1}` : `Item #${index + 1}`}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">
                        {selectedType?.value === "jobs_board" ? "Job Title" : "Item Name"} *
                      </Label>
                      <Input
                        className="mt-1 h-8 text-sm"
                        placeholder={selectedType?.value === "jobs_board" ? "e.g. Truck Driver" : "e.g. Sofa Set"}
                        value={item.name}
                        onChange={(e) => setItemField(index, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        {selectedType?.value === "jobs_board" ? "Salary / Rate" : "Price ($)"}
                      </Label>
                      <Input
                        className="mt-1 h-8 text-sm"
                        placeholder={selectedType?.value === "jobs_board" ? "e.g. $20/hr" : "e.g. 50"}
                        value={item.price}
                        onChange={(e) => setItemField(index, "price", e.target.value)}
                      />
                    </div>
                  </div>
                  {selectedType?.value !== "jobs_board" && (
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        className="mt-1 h-8 text-sm"
                        placeholder="e.g. 2"
                        value={item.quantity}
                        onChange={(e) => setItemField(index, "quantity", e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">
                      {selectedType?.value === "jobs_board" ? "Job Description" : "Item Description"}
                    </Label>
                    <Textarea
                      className="mt-1 text-sm resize-none"
                      rows={2}
                      placeholder={
                        selectedType?.value === "jobs_board"
                          ? "Requirements, hours, contact info..."
                          : "Condition, size, colour..."
                      }
                      value={item.description}
                      onChange={(e) => setItemField(index, "description", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notice */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
            <strong>Note:</strong> Your event will be reviewed by an admin before it appears on the home page ticker. You'll be able to track its status in <strong>My Events</strong>.
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl flex-1 sm:flex-none"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#D80621] hover:bg-[#B00520] rounded-xl flex-1"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Submitting…" : "Submit for Approval"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
