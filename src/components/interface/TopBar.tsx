"use client";

import { Building2, CircleHelp, Mail, MapPin, Settings, Users } from "lucide-react";
import { useExperience } from "@/lib/store";
import { getWorld } from "@/world/campus";
import { Brand } from "./Logo";

function LocationChip() {
  const location = useExperience((s) => s.location);
  const level = getWorld().levels[location.level];
  const floor = location.level === "ground" ? "" : level.label.replace(/^HQ /, "");
  return (
    <p className="hud hidden items-center gap-2 rounded-full px-3.5 py-2 text-[13px] md:flex" aria-live="polite">
      <MapPin size={15} className="text-[#8fb2ff]" aria-hidden />
      <span className="text-blue-100/80">You are in</span>
      <strong className="font-semibold">{location.zoneLabel}</strong>
      {floor && <span className="text-blue-100/70">· {floor}</span>}
    </p>
  );
}

export function TopBar() {
  const openModal = useExperience((s) => s.openModal);
  const navPanel = useExperience((s) => s.navPanel);
  const setNavPanel = useExperience((s) => s.setNavPanel);
  return (
    <header data-ui className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
      <div className="pointer-events-auto flex items-center gap-3">
        <div className="hud rounded-2xl px-2.5 py-2 sm:px-3">
          <Brand compact />
        </div>
        <LocationChip />
      </div>
      <nav aria-label="Company" className="pointer-events-auto flex items-center gap-2">
        <button type="button" onClick={() => openModal("company")} className="hud-button flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold sm:px-4">
          <Building2 size={18} aria-hidden />
          <span className="hidden sm:inline">About us</span>
          <span className="sr-only sm:hidden">About us</span>
        </button>
        <button type="button" onClick={() => openModal("directory")} className="hud-button flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold sm:px-4">
          <Users size={18} aria-hidden />
          <span className="hidden lg:inline">Directory</span>
          <span className="sr-only lg:hidden">Staff directory</span>
        </button>
        <button type="button" onClick={() => openModal("contact")} className="flex h-11 items-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(47,107,255,0.45)] hover:bg-brand-dark sm:px-4">
          <Mail size={18} aria-hidden />
          <span className="hidden sm:inline">Contact us</span>
          <span className="sr-only sm:hidden">Contact us</span>
        </button>
        <button type="button" onClick={() => openModal("help")} className="hud-button grid h-11 w-11 place-items-center rounded-xl" aria-label="Help and controls">
          <CircleHelp size={19} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setNavPanel(navPanel === "settings" ? null : "settings")}
          aria-expanded={navPanel === "settings"}
          aria-controls="settings-panel"
          className="hud-button grid h-11 w-11 place-items-center rounded-xl"
          aria-label="Graphics settings"
        >
          <Settings size={19} aria-hidden />
        </button>
      </nav>
    </header>
  );
}
