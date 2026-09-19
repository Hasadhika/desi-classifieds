import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, CheckCircle2 } from "lucide-react";

const PERKS = [
  "100% Free to post",
  "Reaches 10K+ members",
  "Live in minutes",
  "No hidden fees",
];

export default function CTABanner() {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1A1A] via-[#250810] to-[#1A1A1A] px-8 py-12 md:px-16 md:py-16">
          {/* Glow */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#D80621] opacity-10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 left-1/4 w-60 h-60 bg-[#D80621] opacity-5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row items-center gap-10 lg:gap-0 justify-between">
            {/* Left: copy */}
            <div className="text-center lg:text-left">
              <span className="inline-block text-xs font-bold tracking-widest text-[#D80621] uppercase mb-3">
                Ready to get started?
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
                Sell Faster. Find Easier.<br />
                <span className="text-[#D80621]">Join the Desi Community.</span>
              </h2>
              <p className="text-white/50 text-sm max-w-md mb-6">
                Post your ad for free and reach thousands of South Asian community members across Canada — no credit card needed.
              </p>

              {/* Perks */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start">
                {PERKS.map(p => (
                  <span key={p} className="flex items-center gap-1.5 text-xs text-white/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <Link to={createPageUrl("PostAd")}>
                <button className="w-full sm:w-auto lg:w-48 flex items-center justify-center gap-2 bg-[#D80621] hover:bg-[#b00520] text-white font-bold px-7 py-3.5 rounded-xl text-sm shadow-xl shadow-red-900/30 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  <Plus className="w-4 h-4" />
                  Post Free Ad
                </button>
              </Link>
              <Link to={createPageUrl("Browse")}>
                <button className="w-full sm:w-auto lg:w-48 flex items-center justify-center gap-2 bg-white/8 hover:bg-white/12 border border-white/15 text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition-all">
                  <Search className="w-4 h-4" />
                  Browse Listings
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
