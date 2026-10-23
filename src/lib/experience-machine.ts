import type { ExperienceMode, ModalId } from "@/types/experience";

/**
 * The interaction controller (TRD §2): one source of truth for the experience mode.
 * Pure reducer so it can be unit tested without React or WebGL.
 */

export type ExploreMode = "overview" | "walking";

export interface MachineState {
  mode: ExperienceMode;
  /** Where to return after transitions, selections and panels. */
  exploreMode: ExploreMode;
  /** Mode to restore when a modal closes. */
  modalReturnMode: ExperienceMode | null;
  selectedContentId: string | null;
  selectedAnchorId: string | null;
  modal: ModalId | null;
  error: string | null;
}

export type MachineEvent =
  | { type: "SCENE_READY" }
  | { type: "SCENE_FAILED"; reason: string }
  | { type: "RETRY" }
  | { type: "ENTER" }
  | { type: "MOVE" }
  | { type: "OVERVIEW" }
  | { type: "TRANSITION_START" }
  | { type: "TRANSITION_END" }
  | { type: "SELECT"; contentId: string; anchorId?: string | null }
  | { type: "DESELECT" }
  | { type: "OPEN_MODAL"; modal: ModalId }
  | { type: "CLOSE_MODAL" };

export const initialMachineState: MachineState = {
  mode: "loading",
  exploreMode: "overview",
  modalReturnMode: null,
  selectedContentId: null,
  selectedAnchorId: null,
  modal: null,
  error: null,
};

const EXPLORING: ExperienceMode[] = ["overview", "walking", "cameraTransition", "objectSelected"];

export const isExploring = (mode: ExperienceMode) => EXPLORING.includes(mode);

/** Movement and scene input are disabled in these modes (and whenever a modal is open). */
export function isInputLocked(s: Pick<MachineState, "mode" | "modal">) {
  return s.modal !== null || s.mode === "loading" || s.mode === "intro" || s.mode === "panelOpen" || s.mode === "errorFallback";
}

const clearSelection = { selectedContentId: null, selectedAnchorId: null };

export function experienceReducer(state: MachineState, event: MachineEvent): MachineState {
  if (event.type === "SCENE_FAILED") {
    return { ...state, ...clearSelection, mode: "errorFallback", error: event.reason, modal: null, modalReturnMode: null };
  }

  // Modals can open over any state. In exploring modes they become the "panelOpen" mode.
  if (event.type === "OPEN_MODAL") {
    if (state.modal === event.modal) return state;
    if (isExploring(state.mode)) {
      return { ...state, mode: "panelOpen", modal: event.modal, modalReturnMode: state.mode === "cameraTransition" ? state.exploreMode : state.mode };
    }
    if (state.mode === "panelOpen") return { ...state, modal: event.modal };
    return { ...state, modal: event.modal };
  }
  if (event.type === "CLOSE_MODAL") {
    if (state.modal === null) return state;
    if (state.mode === "panelOpen") {
      return { ...state, mode: state.modalReturnMode ?? state.exploreMode, modal: null, modalReturnMode: null };
    }
    return { ...state, modal: null };
  }

  switch (state.mode) {
    case "loading":
      if (event.type === "SCENE_READY") return { ...state, mode: "intro", error: null };
      return state;

    case "intro":
      if (event.type === "ENTER") return { ...state, mode: "overview", exploreMode: "overview" };
      return state;

    case "errorFallback":
      if (event.type === "RETRY") return { ...initialMachineState };
      return state;

    case "panelOpen":
      // Scene input is ignored while a modal captures keyboard input.
      return state;

    case "overview":
    case "walking":
    case "cameraTransition":
    case "objectSelected": {
      switch (event.type) {
        case "MOVE":
          return { ...state, ...clearSelection, mode: "walking", exploreMode: "walking" };
        case "OVERVIEW":
          return { ...state, ...clearSelection, mode: "cameraTransition", exploreMode: "overview" };
        case "TRANSITION_START":
          if (state.mode === "objectSelected") return state;
          return { ...state, mode: "cameraTransition" };
        case "TRANSITION_END":
          if (state.mode !== "cameraTransition") return state;
          return { ...state, mode: state.selectedContentId ? "objectSelected" : state.exploreMode };
        case "SELECT":
          return { ...state, mode: "objectSelected", selectedContentId: event.contentId, selectedAnchorId: event.anchorId ?? null };
        case "DESELECT":
          if (state.mode !== "objectSelected" && !state.selectedContentId) return state;
          return { ...state, ...clearSelection, mode: state.exploreMode };
        default:
          return state;
      }
    }
  }
}
