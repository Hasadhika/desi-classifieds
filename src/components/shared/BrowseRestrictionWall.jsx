import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const FREE_BROWSE_MS = 120_000;
const TIMER_KEY = "dc_free_browse_start";

export function useBrowseRestriction(isAuthenticated) {
  const [isBlocked, setIsBlocked] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      setIsBlocked(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const stored = localStorage.getItem(TIMER_KEY);
    const startTime = stored ? parseInt(stored, 10) : Date.now();

    if (!stored) {
      localStorage.setItem(TIMER_KEY, startTime.toString());
    }

    const elapsed = Date.now() - startTime;
    const remaining = FREE_BROWSE_MS - elapsed;

    if (remaining <= 0) {
      setIsBlocked(true);
      return;
    }

    timerRef.current = setTimeout(() => {
      setIsBlocked(true);
    }, remaining);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated]);

  return { isBlocked };
}

export default function BrowseRestrictionWall() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.85) 100%)",
          opacity: visible ? 1 : 0,
        }}
      />

      <div
        className="relative transition-transform duration-500 ease-out"
        style={{ transform: visible ? "translateY(0)" : "translateY(100%)" }}
      >
        <div className="bg-white rounded-t-3xl shadow-2xl px-6 pt-6 pb-10">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

          <div className="flex flex-col items-center text-center max-w-sm mx-auto">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-[#D80621]" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Sign up to keep browsing
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Create a free account to see more listings, message sellers, and post your own ads.
            </p>

            <Link to={createPageUrl("Signup")} className="w-full mb-3">
              <Button className="w-full h-12 bg-[#D80621] hover:bg-[#B00520] text-white font-semibold rounded-xl text-base gap-2">
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <Link to={createPageUrl("Login")} className="w-full">
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl font-medium text-base border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Log In
              </Button>
            </Link>

            <p className="text-xs text-gray-400 mt-5">
              Free to join · No credit card required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
