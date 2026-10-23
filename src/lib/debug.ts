"use client";

import { getAnchor } from "@/config/interactions";
import type { LevelId } from "@/types/experience";
import { getWorld } from "@/world/campus";
import { runtime } from "./runtime";
import { showEntity } from "./actions";
import { type CameraCommand, useExperience } from "./store";

/**
 * Read-only inspection hook for automated browser tests and manual QA.
 * Only installed when the page is opened with `?debug=1`; it exposes no personal data.
 */
export function installDebugHook() {
  if (typeof window === "undefined" || !new URLSearchParams(window.location.search).has("debug")) return;
  const api = {
    state: () => {
      const s = useExperience.getState();
      return {
        mode: s.mode,
        modal: s.modal,
        selectedContentId: s.selectedContentId,
        selectedAnchorId: s.selectedAnchorId,
        nav: s.nav,
        location: s.location,
        cutLevels: s.cutLevels,
        floorView: s.floorView,
        qualityTier: s.qualityTier,
        touchControls: s.touchControls,
      };
    },
    player: () => ({ ...runtime.player }),
    cam: () => ({ ...runtime.camera }),
    stats: () => ({ ...runtime.stats }),
    project: (x: number, y: number, z: number) => runtime.project?.(x, y, z) ?? null,
    /** An anchor's level, centre and walk-up point (lets tests stand where the app would). */
    anchor: (anchorId: string) => {
      const a = getAnchor(anchorId);
      return a ? { id: a.id, contentId: a.contentId, level: a.level, p: a.p, approach: a.approach } : null;
    },
    /** Anchor IDs that open a given entity (person, room or object). */
    anchorsOf: (contentId: string) => getWorld().anchors.filter((a) => a.contentId === contentId).map((a) => a.id),
    /** Screen position of an interactive anchor's centre. */
    anchorScreen: (anchorId: string) => {
      const a = getAnchor(anchorId);
      return a && runtime.project ? runtime.project(a.p[0], a.p[1], a.p[2]) : null;
    },
    /** Screen position of a floor point on a level. */
    floorScreen: (level: LevelId, x: number, z: number) => {
      const y = getWorld().levels[level].elevation;
      return runtime.project ? runtime.project(x, y + 0.03, z) : null;
    },
    /** Test helpers: same commands the UI sends. */
    teleport: (level: LevelId, x: number, z: number, ry = 0) => useExperience.getState().sendNav({ kind: "teleport", level, x, z, ry }),
    navigate: (destinationId: string) => useExperience.getState().sendNav({ kind: "destination", destinationId }),
    camera: (cmd: CameraCommand) => useExperience.getState().sendCamera(cmd),
    /** Select any entity (person, room, object) as the HTML lists do. */
    show: (id: string) => showEntity(id),
    /** Seat / person placement summary. */
    seat: (personId: string) => getWorld().seats.find((s) => s.personId === personId) ?? null,
    room: (roomId: string) => getWorld().rooms.find((r) => r.id === roomId) ?? null,
  };
  (window as unknown as { __CVO__: typeof api }).__CVO__ = api;
}
