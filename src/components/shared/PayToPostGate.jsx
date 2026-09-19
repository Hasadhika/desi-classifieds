import React from "react";
import { AlertCircle, CreditCard, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PayToPostGate({ open, onClose, price, freeLimit, onProceedWithPayment }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">Post More Ads</DialogTitle>
        </DialogHeader>
        <div className="text-center py-2">
          <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
          <p className="text-gray-700 font-medium mb-1">Free ad limit reached</p>
          <p className="text-gray-500 text-sm mb-5 leading-relaxed">
            You've used your {freeLimit} free ad{freeLimit !== 1 ? "s" : ""}. Post more ads for just{" "}
            <span className="text-[#D80621] font-bold">${price} CAD</span> per additional ad.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 text-left mb-5 space-y-2">
            {["Your ad reaches thousands of local buyers", "Stays active for 30 days", "Photo upload included", "Instant visibility"].map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                {b}
              </div>
            ))}
          </div>

          <Button
            className="w-full h-11 bg-[#D80621] hover:bg-[#B00520] text-white font-semibold rounded-xl"
            onClick={onProceedWithPayment}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ${price} & Post Ad
          </Button>
          <button
            onClick={onClose}
            className="mt-3 text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
