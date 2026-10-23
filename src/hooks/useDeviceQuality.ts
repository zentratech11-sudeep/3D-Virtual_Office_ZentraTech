"use client";

import { useEffect } from "react";
import { hydratePreferences, useExperience } from "@/lib/store";
import type { QualityTier } from "@/types/experience";

interface DeviceInfo {
  coarsePointer: boolean;
  touchPoints: number;
  minScreen: number;
  cores: number;
  memoryGb: number;
  saveData: boolean;
}

/** Automatic quality tier from coarse device signals (PRD FR-09). */
export function autoQualityTier(d: DeviceInfo): QualityTier {
  if (d.saveData) return "low";
  if (d.coarsePointer && d.minScreen < 820) return "low";
  if (d.cores > 0 && d.cores <= 4) return "low";
  if (d.memoryGb > 0 && d.memoryGb <= 4) return "low";
  return "high";
}

function readDevice(): DeviceInfo {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return {
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    touchPoints: navigator.maxTouchPoints ?? 0,
    minScreen: Math.min(window.screen?.width ?? window.innerWidth, window.screen?.height ?? window.innerHeight),
    cores: navigator.hardwareConcurrency ?? 0,
    memoryGb: nav.deviceMemory ?? 0,
    saveData: !!nav.connection?.saveData,
  };
}

export function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return (window.matchMedia?.("(pointer: coarse)").matches ?? false) || (navigator.maxTouchPoints ?? 0) > 0;
}

/** Resolves the quality tier and touch-control visibility once on the client. */
export function useDeviceQuality() {
  useEffect(() => {
    hydratePreferences();
    const st = useExperience.getState();
    const params = new URLSearchParams(window.location.search);
    const forced = params.get("quality");
    if (forced === "low" || forced === "high") st.setQualityPreference(forced);
    else if (st.qualityPreference === "auto") st.setQualityTier(autoQualityTier(readDevice()));
    st.setTouchControls(isTouchDevice() || params.get("touch") === "1");
  }, []);
}
