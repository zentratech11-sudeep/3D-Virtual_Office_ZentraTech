"use client";

import { isExploring, isInputLocked } from "@/lib/experience-machine";
import { useExperience } from "@/lib/store";

/** Convenience selectors over the single interaction-mode source of truth. */
export function useExperienceMode() {
  const mode = useExperience((s) => s.mode);
  const modal = useExperience((s) => s.modal);
  return { mode, modal, exploring: isExploring(mode), inputLocked: isInputLocked({ mode, modal }) };
}
