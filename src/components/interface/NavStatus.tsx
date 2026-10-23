"use client";

import { CircleCheck, FastForward, Footprints, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useExperience } from "@/lib/store";

/** Shows the active route ("Walking to…") with Skip/Cancel, plus arrival and failure feedback. */
export function NavStatus() {
  const nav = useExperience((s) => s.nav);
  const sendNav = useExperience((s) => s.sendNav);
  const [hidden, setHidden] = useState<typeof nav | null>(null);

  useEffect(() => {
    if (nav.state !== "arrived" && nav.state !== "failed") return;
    const t = window.setTimeout(() => setHidden(nav), nav.state === "failed" ? 3500 : 2200);
    return () => window.clearTimeout(t);
  }, [nav]);

  if (nav.state === "idle" || hidden === nav) return null;
  return (
    <div data-ui role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 top-[72px] z-20 flex justify-center px-3 sm:top-20">
      <div className="hud animate-fade-up pointer-events-auto flex items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 text-sm">
        {nav.state === "moving" && (
          <>
            <Footprints size={16} className="text-[#8fb2ff]" aria-hidden />
            <span>
              Walking to <strong>{nav.label}</strong>…
            </span>
            <button type="button" onClick={() => sendNav({ kind: "skip" })} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">
              <FastForward size={14} aria-hidden /> Skip
            </button>
            <button type="button" onClick={() => sendNav({ kind: "cancel" })} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10" aria-label="Cancel walking">
              <X size={15} aria-hidden />
            </button>
          </>
        )}
        {nav.state === "arrived" && (
          <span className="flex items-center gap-2 py-1.5 pr-3">
            <CircleCheck size={16} className="text-emerald-400" aria-hidden /> Arrived at <strong>{nav.label}</strong>
          </span>
        )}
        {nav.state === "failed" && (
          <span className="flex items-center gap-2 py-1.5 pr-3">
            <TriangleAlert size={16} className="text-amber-300" aria-hidden /> {nav.message ?? "Can't go there."}
          </span>
        )}
      </div>
    </div>
  );
}
