"use client";

import { Gauge, X } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useExperience } from "@/lib/store";
import type { QualityPreference } from "@/types/experience";

const OPTIONS: Array<{ id: QualityPreference; label: string; hint: string }> = [
  { id: "auto", label: "Automatic", hint: "Adapts to your device" },
  { id: "high", label: "High", hint: "Shadows, reflections, ambient people" },
  { id: "low", label: "Low", hint: "Faster on phones and older laptops" },
];

/** Graphics quality (PRD FR-09) and accessibility toggles. */
export function SettingsPanel() {
  const pref = useExperience((s) => s.qualityPreference);
  const tier = useExperience((s) => s.qualityTier);
  const setPref = useExperience((s) => s.setQualityPreference);
  const touch = useExperience((s) => s.touchControls);
  const setTouch = useExperience((s) => s.setTouchControls);
  const close = useExperience((s) => s.setNavPanel);
  const reduced = useReducedMotion();
  return (
    <section id="settings-panel" data-ui data-capture-keys aria-label="Settings" className="hud animate-fade-up pointer-events-auto absolute right-3 top-[68px] z-30 w-[min(92vw,300px)] rounded-2xl p-4 sm:right-4 sm:top-[76px]">
      <header className="mb-3 flex items-center gap-2">
        <Gauge size={18} className="text-[#8fb2ff]" aria-hidden />
        <h2 className="flex-1 text-[15px] font-bold">Settings</h2>
        <button type="button" onClick={() => close(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10" aria-label="Close settings">
          <X size={16} aria-hidden />
        </button>
      </header>
      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-200/70">Graphics quality</legend>
        <div className="flex flex-col gap-1.5">
          {OPTIONS.map((o) => (
            <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${pref === o.id ? "bg-brand/30 ring-1 ring-[#6f9bff]" : "hover:bg-white/5"}`}>
              <input type="radio" name="quality" value={o.id} checked={pref === o.id} onChange={() => setPref(o.id)} className="accent-[#5b8cff]" />
              <span>
                <span className="block text-sm font-semibold">{o.label}</span>
                <span className="block text-xs text-blue-100/70">{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-blue-100/70">Currently rendering: {tier === "high" ? "High" : "Low"} quality.</p>
      </fieldset>
      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-sm">
        <span>On-screen joystick</span>
        <input type="checkbox" checked={touch} onChange={(e) => setTouch(e.target.checked)} className="h-4 w-4 accent-[#5b8cff]" />
      </label>
      <p className="mt-3 text-xs text-blue-100/70">{reduced ? "Reduced motion is on: camera moves instantly." : "Camera transitions follow your system's reduced-motion setting."}</p>
    </section>
  );
}
