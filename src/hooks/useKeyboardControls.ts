"use client";

import { useEffect } from "react";
import { deselect } from "@/lib/actions";
import { isInputLocked } from "@/lib/experience-machine";
import { MOVEMENT_CODES, shouldIgnoreMovementKey } from "@/lib/input";
import { resetInput, runtime } from "@/lib/runtime";
import { useExperience } from "@/lib/store";

/** Escape closes the top-most layer: modal → nav panel → info card → active route → floor preview. */
export function handleEscape() {
  const st = useExperience.getState();
  if (st.modal) return st.closeModal();
  if (st.navPanel) return st.setNavPanel(null);
  if (st.selectedContentId) return deselect();
  if (st.nav.state === "moving") return st.sendNav({ kind: "cancel" });
  if (st.floorView) {
    st.setFloorView(null);
    st.sendCamera({ kind: "follow" });
  }
}

/** Global keyboard handling: WASD/arrows move, Shift runs, Q/E rotate, +/- zoom, Esc closes. */
export function useKeyboardControls() {
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleEscape();
        return;
      }
      const st = useExperience.getState();
      if (shouldIgnoreMovementKey(e.target, isInputLocked(st))) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (MOVEMENT_CODES.has(e.code)) {
        runtime.input.keys.add(e.code);
        if (e.code.startsWith("Arrow")) e.preventDefault();
        return;
      }
      if (e.repeat) return;
      if (e.code === "KeyQ") st.sendCamera({ kind: "rotate", deltaDeg: 45 });
      else if (e.code === "KeyE") st.sendCamera({ kind: "rotate", deltaDeg: -45 });
      else if (e.key === "+" || e.key === "=") st.sendCamera({ kind: "zoom", factor: 0.75 });
      else if (e.key === "-" || e.key === "_") st.sendCamera({ kind: "zoom", factor: 1.35 });
    };
    const onUp = (e: KeyboardEvent) => {
      runtime.input.keys.delete(e.code);
    };
    const onBlur = () => resetInput();
    const onVisibility = () => {
      if (document.hidden) resetInput();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    // Drop held keys whenever input becomes locked (e.g. a modal opens mid-walk).
    const unsub = useExperience.subscribe((s, prev) => {
      if (isInputLocked(s) && !isInputLocked(prev)) resetInput();
    });
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      unsub();
    };
  }, []);
}
