"use client";

import { create } from "zustand";
import { experienceConfig } from "@/config/office";
import type {
  Vec3,
  BuildingId,
  CompanySectionId,
  ContactTopic,
  LevelId,
  ModalId,
  QualityPreference,
  QualityTier,
} from "@/types/experience";
import { type MachineEvent, type MachineState, experienceReducer, initialMachineState } from "./experience-machine";

export type CameraCommand =
  | { kind: "overview" }
  | { kind: "follow" }
  | { kind: "destination"; destinationId: string }
  | { kind: "anchor"; anchorId: string }
  | { kind: "room"; roomId: string }
  | { kind: "floor"; buildingId: BuildingId; level: LevelId }
  | { kind: "rotate"; deltaDeg: number }
  | { kind: "zoom"; factor: number };

export type NavCommand =
  | { kind: "point"; level: LevelId; x: number; z: number; label?: string }
  | { kind: "destination"; destinationId: string }
  | { kind: "anchor"; anchorId: string }
  | { kind: "level"; buildingId: BuildingId; level: LevelId }
  | { kind: "teleport"; level: LevelId; x: number; z: number; ry?: number }
  | { kind: "skip" }
  | { kind: "cancel" };

export interface NavStatus {
  state: "idle" | "moving" | "arrived" | "failed";
  label?: string;
  message?: string;
  /** Entity the route leads to (room or person), for highlighting. */
  targetId?: string;
}

export interface PanelEntry {
  contentId: string;
  anchorId: string | null;
}

interface Command<T> {
  nonce: number;
  cmd: T;
}

export interface ExperienceStore extends MachineState {
  dispatch: (e: MachineEvent) => void;

  /** Previously viewed cards, for the panel's Back button. */
  panelStack: PanelEntry[];
  pushPanel: (e: PanelEntry) => void;
  popPanel: () => PanelEntry | undefined;

  /** Directory search state (kept while the dialog is closed and reopened). */
  directoryQuery: string;
  directoryDept: string | null;
  setDirectoryQuery: (q: string) => void;
  setDirectoryDept: (d: string | null) => void;

  webgl: "unknown" | "ok" | "unsupported";
  setWebgl: (v: "ok" | "unsupported") => void;

  loadProgress: number;
  loadStage: string;
  setLoadProgress: (progress: number, stage: string) => void;

  qualityPreference: QualityPreference;
  qualityTier: QualityTier;
  setQualityPreference: (p: QualityPreference) => void;
  setQualityTier: (t: QualityTier) => void;

  hintVisible: boolean;
  showHint: () => void;
  dismissHint: () => void;

  nav: NavStatus;
  setNav: (n: NavStatus) => void;

  location: { level: LevelId; zoneLabel: string };
  setLocation: (level: LevelId, zoneLabel: string) => void;

  /** Floor chosen in the "Floors" menu; overrides automatic cutaway for that building. */
  floorView: { buildingId: BuildingId; level: LevelId } | null;
  setFloorView: (v: { buildingId: BuildingId; level: LevelId } | null) => void;

  /** Number of visible storeys per building minus one (computed by the scene). */
  cutLevels: Record<BuildingId, number>;
  setCutLevels: (c: Record<BuildingId, number>) => void;

  hoveredAnchorId: string | null;
  setHoveredAnchor: (id: string | null) => void;

  /** Current click-to-move route, for the on-floor path cue. */
  route: { points: Vec3[]; target: Vec3 } | null;
  setRoute: (r: { points: Vec3[]; target: Vec3 } | null) => void;
  clickCue: { nonce: number; p: Vec3; ok: boolean } | null;
  showClickCue: (p: Vec3, ok: boolean) => void;

  /** Bit mask of wall orientations facing the camera (drives dollhouse cutaway). */
  facingMask: number;
  setFacingMask: (m: number) => void;

  contactPreset: { topic: ContactTopic; recipient: string };
  companySection: CompanySectionId;
  openModal: (modal: ModalId, opts?: { topic?: ContactTopic; recipient?: string; section?: CompanySectionId }) => void;
  closeModal: () => void;

  cameraCommand: Command<CameraCommand> | null;
  sendCamera: (cmd: CameraCommand) => void;
  navCommand: Command<NavCommand> | null;
  sendNav: (cmd: NavCommand) => void;

  /** Camera is far enough out for campus-level labels. */
  overviewScale: boolean;
  setOverviewScale: (v: boolean) => void;

  touchControls: boolean;
  setTouchControls: (v: boolean) => void;

  /** Open navigation side panel. */
  navPanel: "floors" | "map" | "settings" | null;
  setNavPanel: (p: "floors" | "map" | "settings" | null) => void;

  announcement: string;
  announce: (text: string) => void;
}

let nonce = 0;

function readStorage(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) — conveniences only */
  }
}

export const useExperience = create<ExperienceStore>()((set, get) => ({
  ...initialMachineState,
  dispatch: (e) =>
    set((s) => {
      const next = experienceReducer(s, e);
      // Leaving a selection forgets the Back history.
      return next.selectedContentId ? next : { ...next, panelStack: [] };
    }),

  panelStack: [],
  pushPanel: (e) => set((s) => ({ panelStack: [...s.panelStack.slice(-19), e] })),
  popPanel: () => {
    const stack = get().panelStack;
    const top = stack[stack.length - 1];
    if (top) set({ panelStack: stack.slice(0, -1) });
    return top;
  },

  directoryQuery: "",
  directoryDept: null,
  setDirectoryQuery: (directoryQuery) => set({ directoryQuery }),
  setDirectoryDept: (directoryDept) => set({ directoryDept }),

  webgl: "unknown",
  setWebgl: (webgl) => set({ webgl }),

  loadProgress: 0,
  loadStage: "Preparing",
  setLoadProgress: (loadProgress, loadStage) => set((s) => (loadProgress > s.loadProgress ? { loadProgress, loadStage } : s)),

  qualityPreference: "auto",
  qualityTier: "high",
  setQualityPreference: (qualityPreference) => {
    writeStorage(experienceConfig.storageKeys.quality, qualityPreference);
    set(qualityPreference === "auto" ? { qualityPreference } : { qualityPreference, qualityTier: qualityPreference });
  },
  setQualityTier: (qualityTier) => set({ qualityTier }),

  hintVisible: false,
  showHint: () => {
    if (readStorage(experienceConfig.storageKeys.hintDismissed) !== "1") set({ hintVisible: true });
  },
  dismissHint: () => {
    writeStorage(experienceConfig.storageKeys.hintDismissed, "1");
    set({ hintVisible: false });
  },

  nav: { state: "idle" },
  setNav: (nav) => set({ nav }),

  location: { level: "ground", zoneLabel: "Main Entrance" },
  setLocation: (level, zoneLabel) => {
    const cur = get().location;
    if (cur.level !== level || cur.zoneLabel !== zoneLabel) set({ location: { level, zoneLabel } });
  },

  floorView: null,
  setFloorView: (floorView) => set({ floorView }),

  cutLevels: { hq: 2, marketing: 1, sales: 1 },
  setCutLevels: (c) => {
    const cur = get().cutLevels;
    if (cur.hq !== c.hq || cur.marketing !== c.marketing || cur.sales !== c.sales) set({ cutLevels: c });
  },

  hoveredAnchorId: null,
  setHoveredAnchor: (hoveredAnchorId) => {
    if (get().hoveredAnchorId !== hoveredAnchorId) set({ hoveredAnchorId });
  },

  route: null,
  setRoute: (route) => set({ route }),
  clickCue: null,
  showClickCue: (p, ok) => set({ clickCue: { nonce: ++nonce, p, ok } }),

  facingMask: 0,
  setFacingMask: (facingMask) => set({ facingMask }),

  contactPreset: { topic: "general", recipient: "" },
  companySection: "about",
  openModal: (modal, opts = {}) => {
    if (modal === "contact") set({ contactPreset: { topic: opts.topic ?? "general", recipient: opts.recipient ?? "" } });
    if (modal === "company") set({ companySection: opts.section ?? "about" });
    get().dispatch({ type: "OPEN_MODAL", modal });
  },
  closeModal: () => get().dispatch({ type: "CLOSE_MODAL" }),

  cameraCommand: null,
  sendCamera: (cmd) => set({ cameraCommand: { nonce: ++nonce, cmd } }),
  navCommand: null,
  sendNav: (cmd) => set({ navCommand: { nonce: ++nonce, cmd } }),

  overviewScale: true,
  setOverviewScale: (overviewScale) => {
    if (get().overviewScale !== overviewScale) set({ overviewScale });
  },

  touchControls: false,
  setTouchControls: (touchControls) => set({ touchControls }),

  navPanel: null,
  setNavPanel: (navPanel) => set({ navPanel }),

  announcement: "",
  announce: (announcement) => set({ announcement }),
}));

/** Restores per-visitor preferences (call once on the client). */
export function hydratePreferences() {
  const q = readStorage(experienceConfig.storageKeys.quality);
  if (q === "auto" || q === "high" || q === "low") useExperience.getState().setQualityPreference(q);
}
