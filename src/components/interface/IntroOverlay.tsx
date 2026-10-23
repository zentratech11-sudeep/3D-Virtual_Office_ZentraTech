"use client";

import { ChevronRight, Layers, MousePointerClick, Move } from "lucide-react";
import { company } from "@/data/company-content";
import { enterExperience } from "@/lib/actions";
import { useExperience } from "@/lib/store";
import { Brand } from "./Logo";

/** Intro card over the slowly orbiting campus with the "Explore the office" entry action. */
export function IntroOverlay() {
  const openModal = useExperience((s) => s.openModal);
  return (
    <div data-ui className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between bg-gradient-to-t from-navy/90 via-navy/30 to-navy/40 p-4 sm:bg-gradient-to-r sm:from-navy/70 sm:via-navy/25 sm:to-transparent sm:p-8">
      <Brand />
      <div className="animate-fade-up pointer-events-auto max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Welcome to</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-5xl">
          {company.name} <span className="text-[#8fb2ff]">Office</span>
        </h1>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-blue-50/90">
          Walk around our campus, meet the team, discover our services and get in touch — all in your browser.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={enterExperience}
            className="animate-pulse-ring group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#1d3c8f] to-[#13224a] py-2 pl-6 pr-2 text-base font-semibold text-white ring-1 ring-white/25 hover:from-[#2550b8]"
            autoFocus
          >
            Explore the office
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-navy transition-transform group-hover:translate-x-0.5">
              <ChevronRight size={20} aria-hidden />
            </span>
          </button>
          <button type="button" onClick={() => openModal("company")} className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/90 underline-offset-4 hover:underline">
            View 2D version
          </button>
        </div>
      </div>
      <ul className="pointer-events-auto hidden gap-6 text-sm text-blue-50/85 sm:flex">
        <li className="flex items-center gap-2">
          <Move size={16} aria-hidden /> Walk with WASD or arrow keys
        </li>
        <li className="flex items-center gap-2">
          <MousePointerClick size={16} aria-hidden /> Click people, rooms and objects
        </li>
        <li className="flex items-center gap-2">
          <Layers size={16} aria-hidden /> Explore every floor
        </li>
      </ul>
    </div>
  );
}
