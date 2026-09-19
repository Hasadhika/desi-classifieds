import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { Star, Zap, TrendingUp, CheckCircle, CreditCard } from "lucide-react";

export default function PromoteListingModal({ open, onClose, listing, price, durationDays, userEmail }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");

  const benefits = [
    { icon: <TrendingUp className="w-4 h-4" />, text: "Featured on the homepage for " + durationDays + " days" },
    { icon: <Star className="w-4 h-4" />, text: "\"Promoted\" badge on your listing" },
    { icon: <Zap className="w-4 h-4" />, text: "Up to 10x more visibility" },
    { icon: <CheckCircle className="w-4 h-4" />, text: "Priority placement in search results" },
  ];

  const handlePayment = async () => {
    if (!cardNumber || !expiry || !cvv || !name) {
      toast.error("Please fill in all payment details");
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const ends = new Date(now);
      ends.setDate(ends.getDate() + parseInt(durationDays || 7));

      const { error } = await supabase.from("promoted_listings").insert({
        listing_id: listing.id,
        user_email: userEmail,
        amount_paid: parseFloat(price),
        status: "active",
        starts_at: now.toISOString(),
        ends_at: ends.toISOString(),
        transaction_id: "TXN-" + Date.now(),
      });

      if (error) throw error;

      await supabase.from("listings").update({ is_featured: true }).eq("id", listing.id);

      toast.success("Your listing is now promoted on the homepage!");
      setStep(3);
    } catch (err) {
      toast.error("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setName("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">Promote Your Listing</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center gap-3">
              {listing?.images?.[0] && (
                <img src={listing.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{listing?.title}</p>
                <p className="text-xs text-gray-500">{listing?.city}, {listing?.province}</p>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-[#D80621] shrink-0">{b.icon}</span>
                  {b.text}
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Promotion fee</span>
                <span className="font-bold text-[#D80621] text-lg">${price} CAD</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">One-time payment for {durationDays}-day promotion</p>
            </div>

            <Button
              className="w-full h-11 bg-[#D80621] hover:bg-[#B00520] text-white font-semibold rounded-xl"
              onClick={() => setStep(2)}
            >
              <CreditCard className="w-4 h-4 mr-2" /> Continue to Payment
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-[#D80621]/5 border border-[#D80621]/20 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Promotion fee</span>
              <span className="font-bold text-[#D80621]">${price} CAD</span>
            </div>

            <div>
              <Label>Cardholder Name</Label>
              <Input className="mt-1.5" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <Label>Card Number</Label>
              <Input
                className="mt-1.5"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                value={cardNumber}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, "").substring(0, 16);
                  setCardNumber(v.replace(/(.{4})/g, "$1 ").trim());
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Expiry</Label>
                <Input
                  className="mt-1.5"
                  placeholder="MM/YY"
                  maxLength={5}
                  value={expiry}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, "").substring(0, 4);
                    setExpiry(v.length > 2 ? v.substring(0, 2) + "/" + v.substring(2) : v);
                  }}
                />
              </div>
              <div>
                <Label>CVV</Label>
                <Input className="mt-1.5" placeholder="123" maxLength={4} type="password" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>

            <Button
              className="w-full h-11 bg-[#D80621] hover:bg-[#B00520] text-white font-semibold rounded-xl"
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? "Processing..." : `Pay $${price} & Promote`}
            </Button>
            <button onClick={() => setStep(1)} className="w-full text-sm text-gray-400 hover:text-gray-600 underline">
              Back
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-bold text-[#1A1A1A] mb-2">You're now promoted!</h3>
            <p className="text-gray-500 text-sm mb-6">
              Your listing will appear on the homepage for the next {durationDays} days with a Promoted badge.
            </p>
            <Button className="w-full bg-[#D80621] hover:bg-[#B00520] rounded-xl" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
