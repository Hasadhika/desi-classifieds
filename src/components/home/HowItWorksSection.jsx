import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PenLine, MessageCircle, Handshake, ArrowRight } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: PenLine,
    title: "Post Your Ad",
    description: "Create a free listing in under 2 minutes. Add photos, set your price, and describe what you're offering.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
    dot: "bg-blue-500",
  },
  {
    number: "02",
    icon: MessageCircle,
    title: "Connect with Buyers",
    description: "Interested buyers reach out via secure in-app chat, phone, or WhatsApp — you choose how.",
    color: "bg-[#FFF5F5] text-[#D80621] border-red-100",
    dot: "bg-[#D80621]",
  },
  {
    number: "03",
    icon: Handshake,
    title: "Close the Deal",
    description: "Meet, agree on a price, and seal the deal. Fast, local, and completely free — no hidden fees.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    dot: "bg-emerald-500",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-[#FAFAFA] border-y border-gray-100 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold tracking-widest text-[#D80621] uppercase mb-3">Simple Process</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] tracking-tight">
            How DesiClassifieds Works
          </h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Buy or sell anything in three easy steps — it's 100% free and takes less than 5 minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line — desktop only */}
          <div className="hidden md:block absolute top-10 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gradient-to-r from-blue-200 via-red-200 to-emerald-200" />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="relative flex flex-col items-center text-center">
                {/* Step number bubble */}
                <div className="relative z-10 mb-5">
                  <div className={`w-20 h-20 rounded-2xl ${step.color} border-2 flex items-center justify-center shadow-sm`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <span className={`absolute -top-2 -right-2 w-7 h-7 ${step.dot} text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md`}>
                    {i + 1}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{step.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            to={createPageUrl("PostAd")}
            className="inline-flex items-center gap-2 bg-[#D80621] hover:bg-[#b00520] text-white font-bold px-7 py-3.5 rounded-xl text-sm shadow-lg shadow-red-900/20 transition-all hover:shadow-red-900/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            Post Your Free Ad
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-gray-400 text-xs mt-3">No sign-up required to browse · Free forever</p>
        </div>
      </div>
    </section>
  );
}
