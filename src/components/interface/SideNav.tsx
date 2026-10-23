"use client";

import { House, Layers, Map as MapIcon } from "lucide-react";
import { goOverview } from "@/lib/actions";
import { useExperience } from "@/lib/store";

/** Overview / Floors / Map navigation (design panel 2). */
export function SideNav() {
  const navPanel = useExperience((s) => s.navPanel);
  const setNavPanel = useExperience((s) => s.setNavPanel);
  const mode = useExperience((s) => s.mode);
  const toggle = (p: "floors" | "map") => setNavPanel(navPanel === p ? null : p);
  const item = "hud-button flex h-12 w-12 items-center justify-center gap-3 rounded-xl text-[15px] font-semibold sm:h-auto sm:w-[168px] sm:justify-start sm:px-4 sm:py-3";
  return (
    <nav data-ui aria-label="Explore" className="pointer-events-auto absolute left-3 top-[76px] z-20 flex flex-col gap-2 sm:left-4 sm:top-[92px]">
      <button type="button" className={item} onClick={() => (setNavPanel(null), goOverview())} aria-pressed={mode === "overview"}>
        <House size={20} aria-hidden />
        <span className="hidden sm:inline">Overview</span>
        <span className="sr-only sm:hidden">Overview</span>
      </button>
      <button type="button" className={item} onClick={() => toggle("floors")} aria-expanded={navPanel === "floors"} aria-controls="floors-panel">
        <Layers size={20} aria-hidden />
        <span className="hidden sm:inline">Floors</span>
        <span className="sr-only sm:hidden">Floors</span>
      </button>
      <button type="button" className={item} onClick={() => toggle("map")} aria-expanded={navPanel === "map"} aria-controls="map-panel">
        <MapIcon size={20} aria-hidden />
        <span className="hidden sm:inline">Map</span>
        <span className="sr-only sm:hidden">Map</span>
      </button>
    </nav>
  );
}
