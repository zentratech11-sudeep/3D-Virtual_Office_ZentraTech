"use client";

import { useEffect, useState } from "react";
import { company } from "@/data/company-content";
import { experienceConfig } from "@/config/office";
import { useExperience } from "@/lib/store";
import { LogoMark } from "./Logo";

/** Branded loading state with real progress and an escape hatch (PRD FR-01). */
export function LoadingScreen() {
  const progress = useExperience((s) => s.loadProgress);
  const stage = useExperience((s) => s.loadStage);
  const openModal = useExperience((s) => s.openModal);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), experienceConfig.loadingTimeoutMs);
    return () => window.clearTimeout(t);
  }, []);

  const pct = Math.round(progress * 100);
  return (
    <div data-ui className="absolute inset-0 z-40 grid place-items-center bg-[radial-gradient(ellipse_at_top,#1b2f63_0%,#0b1630_60%)] px-6 text-white">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <LogoMark size={56} className="drop-shadow-[0_6px_20px_rgba(91,140,255,0.45)]" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{company.name}</h1>
        <p className="mt-1 text-sm text-blue-200/80">Corporate Virtual Office</p>
        <div className="mt-8 w-full">
          <div role="progressbar" aria-label="Loading the 3D office" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#5b8cff] to-[#8b6bff] transition-[width] duration-300" style={{ width: `${Math.max(6, pct)}%` }} />
          </div>
          <p className="mt-3 text-sm text-blue-100/80" aria-live="polite">
            {stage}… {pct}%
          </p>
        </div>
        {slow && (
          <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-blue-50">
            <p>This is taking longer than expected.</p>
            <button type="button" onClick={() => openModal("company")} className="mt-3 rounded-lg bg-white px-4 py-2 font-semibold text-navy hover:bg-blue-50">
              Continue without 3D
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
