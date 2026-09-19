import React from "react";
import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "@/api/eventsApi";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CalendarDays, MapPin, ShoppingBag, Briefcase, Users, Megaphone } from "lucide-react";

const TYPE_CONFIG = {
  sale:       { label: "Yard Sale",   icon: ShoppingBag, color: "#D80621" },
  jobs_board: { label: "Jobs Board",  icon: Briefcase,   color: "#2563eb" },
  community:  { label: "Community",   icon: Users,       color: "#7c3aed" },
};

function EventChip({ event }) {
  const typeCfg = TYPE_CONFIG[event.event_type] || TYPE_CONFIG.sale;
  const TypeIcon = typeCfg.icon;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full whitespace-nowrap shrink-0 hover:bg-white/20 transition-colors cursor-default">
      <TypeIcon className="w-3.5 h-3.5 shrink-0 text-white/90" />
      <span className="text-white font-medium text-sm">{event.title}</span>
      {(event.city || event.province) && (
        <span className="text-white/70 text-xs flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {[event.city, event.province].filter(Boolean).join(", ")}
        </span>
      )}
      {event.event_date && (
        <span className="text-white/70 text-xs flex items-center gap-1">
          <CalendarDays className="w-3 h-3" />
          {new Date(event.event_date + "T00:00:00").toLocaleDateString("en-CA", {
            month: "short",
            day: "numeric",
          })}
        </span>
      )}
      {event.event_time && (
        <span className="text-white/60 text-xs">{event.event_time}</span>
      )}
    </div>
  );
}

export default function EventsMarquee() {
  const { data: events = [] } = useQuery({
    queryKey: ["approved-events"],
    queryFn: () => eventsApi.getApproved(),
    staleTime: 0,             // always fetch fresh on mount
    refetchInterval: 60_000,  // poll every 60 s
  });

  if (!events.length) return null;

  // Duplicate list so the marquee loops seamlessly
  const items = [...events, ...events];

  return (
    <div className="bg-[#D80621] overflow-hidden py-2 relative">
      {/* Left fade + label */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
        <div className="flex items-center gap-2 bg-[#B00520] px-4 h-full shrink-0">
          <Megaphone className="w-4 h-4 text-white" />
          <span className="text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap">
            Events &amp; Sales
          </span>
        </div>
        {/* gradient fade */}
        <div className="w-6 h-full bg-gradient-to-r from-[#D80621] to-transparent" />
      </div>

      {/* Scrolling track */}
      <div
        className="flex gap-3 pl-[160px] pr-4"
        style={{
          animation: "marquee-scroll 20s linear infinite",
          width: "max-content",
        }}
      >
        {items.map((event, idx) => (
          <EventChip key={`${event.id}-${idx}`} event={event} />
        ))}
      </div>

      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#D80621] to-transparent pointer-events-none z-10" />

      {/* Post your event CTA — right side */}
      <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center">
        <Link
          to={createPageUrl("PostEvent")}
          className="bg-[#B00520] hover:bg-[#900418] text-white text-xs font-bold px-4 h-full flex items-center transition-colors whitespace-nowrap"
        >
          + Post Yours
        </Link>
      </div>

      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
