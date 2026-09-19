import React from "react";
import { FileText, Users, MapPin, Shield, Star } from "lucide-react";

const STATS = [
  { icon: FileText, value: "500+",  label: "Active Listings",    accent: "text-[#D80621]" },
  { icon: Users,    value: "10K+",  label: "Community Members",  accent: "text-blue-500"  },
  { icon: MapPin,   value: "50+",   label: "Cities Covered",     accent: "text-emerald-500" },
  { icon: Star,     value: "4.9★",  label: "Avg. Seller Rating", accent: "text-amber-500" },
  { icon: Shield,   value: "100%",  label: "Free to Post",       accent: "text-violet-500" },
];

export default function StatsBar({ listingCount }) {
  const stats = STATS.map(s =>
    s.label === "Active Listings" ? { ...s, value: listingCount || s.value } : s
  );

  return (
    <section className="border-y border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-6 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-3 flex-1 min-w-[140px] px-0 md:px-6 first:pl-0 last:pr-0">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                <s.icon className={`w-4.5 h-4.5 ${s.accent}`} size={18} />
              </div>
              <div>
                <p className={`text-lg font-extrabold ${s.accent} leading-none`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
