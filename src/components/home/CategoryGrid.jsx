import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { createCategoryUrl } from "@/utils/slugify";
import { Home, Car, Briefcase, Wrench, ShoppingBag, Users, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { categoriesApi } from "@/api/categoriesApi";

const ICON_MAP = {
  real_estate: {
    icon: Home,
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    desc: "Rooms, rentals, PG & more",
    emoji: "🏠",
  },
  vehicles: {
    icon: Car,
    gradient: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    desc: "Cars, bikes & carpooling",
    emoji: "🚗",
  },
  jobs: {
    icon: Briefcase,
    gradient: "from-orange-500 to-orange-600",
    bg: "bg-orange-50",
    text: "text-orange-600",
    badge: "bg-orange-100 text-orange-700",
    desc: "IT, trucking & more",
    emoji: "💼",
  },
  services: {
    icon: Wrench,
    gradient: "from-amber-500 to-amber-600",
    bg: "bg-amber-50",
    text: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
    desc: "Immigration, tax & tutors",
    emoji: "🛠",
  },
  buy_sell: {
    icon: ShoppingBag,
    gradient: "from-pink-500 to-rose-600",
    bg: "bg-pink-50",
    text: "text-pink-600",
    badge: "bg-pink-100 text-pink-700",
    desc: "Electronics, furniture & more",
    emoji: "🛒",
  },
  community: {
    icon: Users,
    gradient: "from-violet-500 to-violet-600",
    bg: "bg-violet-50",
    text: "text-violet-600",
    badge: "bg-violet-100 text-violet-700",
    desc: "Events, festivals & more",
    emoji: "🎉",
  },
};

export default function CategoryGrid() {
  const { data: categories = [] } = useQuery({
    queryKey: ["parentCategories"],
    queryFn: () => categoriesApi.getParentCategories(),
  });

  return (
    <section className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#D80621] uppercase">What are you looking for?</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] tracking-tight mt-1">
              Browse by Category
            </h2>
          </div>
          <Link
            to={createPageUrl("Browse")}
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#D80621] hover:text-[#b00520] transition-colors"
          >
            All categories <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map(cat => {
            const d = ICON_MAP[cat.slug] || ICON_MAP.community;
            const Icon = d.icon;
            const url = createCategoryUrl(cat.slug);

            return (
              <Link
                key={cat.slug}
                to={url}
                className="group relative flex flex-col items-center text-center p-5 rounded-2xl border border-gray-100 bg-white hover:border-transparent hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
              >
                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl ${d.bg} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200 overflow-hidden`}>
                  {cat.icon_url ? (
                    <img src={cat.icon_url} alt={cat.label} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{d.emoji}</span>
                  )}
                </div>

                <h3 className={`font-bold text-[#1A1A1A] text-sm mb-1 group-hover:${d.text} transition-colors`}>
                  {cat.label}
                </h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">{d.desc}</p>

                {/* Arrow on hover */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className={`w-3.5 h-3.5 ${d.text}`} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
