import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, ChevronRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { categoriesApi } from "@/api/categoriesApi";

const PROVINCES = [
  "Ontario", "British Columbia", "Alberta", "Quebec", "Manitoba",
  "Saskatchewan", "Nova Scotia", "New Brunswick", "Newfoundland and Labrador",
  "Prince Edward Island",
];

const QUICK_SEARCHES = [
  { label: "Rooms in Brampton",       q: "Rooms", category: "real_estate", province: "Ontario" },
  { label: "IT Jobs Toronto",         q: "IT",    category: "jobs",        province: "Ontario" },
  { label: "Used Cars GTA",           q: "Cars",  category: "vehicles",    province: "Ontario" },
  { label: "Immigration Consultants", q: "Immigration", category: "services" },
  { label: "Catering Services",       q: "Catering",    category: "services" },
];

export default function HeroSection() {
  const [keyword,  setKeyword]  = useState("");
  const [category, setCategory] = useState("");
  const [province, setProvince] = useState("");
  const navigate = useNavigate();

  // Fetch all categories from DB (same source as CategoryGrid)
  const { data: dbCategories = [] } = useQuery({
    queryKey: ["parentCategories"],
    queryFn: () => categoriesApi.getParentCategories(),
  });

  const handleSearch = (overrides = {}) => {
    const params = new URLSearchParams();
    const q = overrides.q ?? keyword;
    const cat = overrides.category ?? category;
    const prov = overrides.province ?? province;
    if (q)    params.set("q", q);
    if (cat)  params.set("category", cat);
    if (prov) params.set("province", prov);
    navigate(createPageUrl("Browse") + (params.toString() ? `?${params}` : ""));
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0f0f0f] via-[#1e0508] to-[#0f0f0f]">
      {/* Ambient glow orbs */}
      <div className="absolute top-0 right-[-10%] w-[600px] h-[600px] bg-[#D80621] opacity-[0.07] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-5%]  w-[400px] h-[400px] bg-[#D80621] opacity-[0.05] rounded-full blur-3xl pointer-events-none" />

      {/* Subtle grid texture */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28">

        {/* ── Top badge ── */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 bg-white/8 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 text-white/75 text-sm font-medium">
            <span className="w-2 h-2 bg-[#D80621] rounded-full animate-pulse shrink-0" />
            Canada's #1 South Asian Classifieds
          </span>
        </div>

        {/* ── Headline ── */}
        <h1 className="text-center text-4xl sm:text-5xl md:text-[3.75rem] font-extrabold text-white leading-[1.1] tracking-tight mb-4">
          Find What You Need,
          <br />
          <span className="text-[#D80621]">Right in Your Community</span>
        </h1>
        <p className="text-center text-white/55 text-lg md:text-xl max-w-2xl mx-auto mb-10">
          Rooms, jobs, services &amp; more — trusted by the South Asian community across Canada.
        </p>

        {/* ── Search card ── */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl shadow-black/40 p-2.5">
          <div className="flex flex-col md:flex-row gap-2">
            {/* Keyword */}
            <div className="flex-1 flex items-center gap-3 px-4 py-0.5 rounded-xl bg-gray-50 border border-gray-100">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                className="flex-1 h-11 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
                placeholder="What are you looking for?"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            {/* Category */}
            <div className="flex items-center gap-2 px-3 py-0.5 rounded-xl bg-gray-50 border border-gray-100 md:w-44">
              <Tag className="w-4 h-4 text-gray-400 shrink-0" />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="flex-1 h-11 border-0 bg-transparent p-0 focus:ring-0 text-sm text-gray-600">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {dbCategories.map(c => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Province */}
            <div className="flex items-center gap-2 px-3 py-0.5 rounded-xl bg-gray-50 border border-gray-100 md:w-44">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger className="flex-1 h-11 border-0 bg-transparent p-0 focus:ring-0 text-sm text-gray-600">
                  <SelectValue placeholder="Province" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => handleSearch()}
              className="h-12 px-8 bg-[#D80621] hover:bg-[#b00520] text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-red-900/30 transition-all active:scale-[.98]"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {/* ── Quick searches ── */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <span className="text-white/30 text-xs self-center mr-1">Popular:</span>
          {QUICK_SEARCHES.map(tag => (
            <button
              key={tag.label}
              onClick={() => handleSearch({ q: tag.q, category: tag.category, province: tag.province })}
              className="flex items-center gap-1.5 text-white/55 hover:text-white text-xs border border-white/10 hover:border-white/25 hover:bg-white/5 rounded-full px-3.5 py-1.5 transition-all"
            >
              {tag.label}
              <ChevronRight className="w-3 h-3" />
            </button>
          ))}
        </div>

        {/* ── Province quick-nav ── */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {["Ontario", "British Columbia", "Alberta", "Quebec", "Manitoba"].map(prov => (
            <button
              key={prov}
              onClick={() => handleSearch({ province: prov })}
              className="text-xs text-white/40 hover:text-white/80 font-medium transition-colors"
            >
              📍 {prov}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
