"use client";

import { ENTRANCE_DESTINATION_ID, getDestination } from "@/config/destinations";
import { getPrimaryAnchorForContent } from "@/config/interactions";
import { movementConfig } from "@/config/office";
import type { BuildingId, LevelId } from "@/types/experience";
import { getWorld } from "@/world/campus";
import { rectContains } from "@/world/builder";
import { track } from "./analytics";
import { entityPlace, entityTitle, resolveEntity } from "./entities";
import { runtime } from "./runtime";
import { useExperience } from "./store";

/**
 * High-level actions shared by the HTML interface and the 3D scene. They are the
 * only way UI code changes experience state, so behaviour stays consistent.
 */

interface SelectOptions {
  anchorId?: string | null;
  /** Ease the camera to the selected object / room. */
  focusCamera?: boolean;
  /** Opened from a link inside another card: remember it for the Back button. */
  fromPanel?: boolean;
  /** Cut the building open on the entity's floor (used when selecting from lists). */
  reveal?: boolean;
}

/** Cut the building open so an entity on another floor (or under a roof) is visible. */
export function revealEntity(id: string) {
  const place = entityPlace(id);
  if (!place) return;
  const st = useExperience.getState();
  const p = runtime.player;
  const building = getWorld().buildings.find((b) => b.id === place.buildingId);
  const playerHere = !!building && p.level === place.level && rectContains(building.rect, p.x, p.z);
  if (!playerHere) st.setFloorView({ buildingId: place.buildingId, level: place.level });
}

export function selectContent(contentId: string, opts: SelectOptions = {}) {
  const entity = resolveEntity(contentId);
  const title = entityTitle(contentId);
  if (!entity || !title) return;
  const st = useExperience.getState();
  if (opts.fromPanel && st.selectedContentId && st.selectedContentId !== contentId) {
    st.pushPanel({ contentId: st.selectedContentId, anchorId: st.selectedAnchorId });
  }
  const anchorId = opts.anchorId !== undefined ? opts.anchorId : entity.kind === "room" ? null : (getPrimaryAnchorForContent(contentId)?.id ?? null);
  if (opts.reveal) revealEntity(contentId);
  st.dispatch({ type: "SELECT", contentId, anchorId });
  st.announce(`${title}: information panel opened.`);
  track("info_card_opened", { id: contentId });
  if (opts.focusCamera) {
    if (entity.kind === "room") st.sendCamera({ kind: "room", roomId: entity.id });
    else if (anchorId) st.sendCamera({ kind: "anchor", anchorId });
  }
}

/** Back to the previously viewed card. */
export function goBack() {
  const st = useExperience.getState();
  const prev = st.popPanel();
  if (!prev) return;
  const entity = resolveEntity(prev.contentId);
  st.dispatch({ type: "SELECT", contentId: prev.contentId, anchorId: prev.anchorId });
  if (entity?.kind === "room") st.sendCamera({ kind: "room", roomId: entity.id });
  else if (prev.anchorId) st.sendCamera({ kind: "anchor", anchorId: prev.anchorId });
}

export function deselect() {
  useExperience.getState().dispatch({ type: "DESELECT" });
}

export function goToDestination(destinationId: string) {
  const d = getDestination(destinationId);
  if (!d) return;
  const st = useExperience.getState();
  st.setFloorView(null);
  st.sendNav({ kind: "destination", destinationId });
  st.announce(`Heading to ${d.label}.`);
  track("destination_selected", { id: destinationId });
}

export function walkToAnchor(anchorId: string) {
  const st = useExperience.getState();
  st.setFloorView(null);
  st.sendNav({ kind: "anchor", anchorId });
}

/** Walk to a room, a person's desk or an object. */
export function walkToEntity(id: string) {
  const entity = resolveEntity(id);
  if (!entity) {
    if (getDestination(id)) goToDestination(id);
    return;
  }
  if (entity.kind === "room") return goToDestination(entity.id);
  const anchor = getPrimaryAnchorForContent(id);
  if (anchor) walkToAnchor(anchor.id);
}

/** Pick an entity from an HTML list (directory, team card): reveal, frame and open it. */
export function showEntity(id: string, opts: { fromPanel?: boolean } = {}) {
  const st = useExperience.getState();
  if (st.modal) st.closeModal();
  selectContent(id, { reveal: true, focusCamera: true, fromPanel: opts.fromPanel });
}

export function openDirectory() {
  useExperience.getState().openModal("directory");
}

export function goOverview() {
  const st = useExperience.getState();
  st.setFloorView(null);
  st.dispatch({ type: "OVERVIEW" });
  st.sendCamera({ kind: "overview" });
  st.announce("Campus overview.");
}

export function recenterOnCharacter() {
  const st = useExperience.getState();
  st.setFloorView(null);
  st.dispatch({ type: "MOVE" });
  st.sendCamera({ kind: "follow" });
}

export function returnToEntrance() {
  const st = useExperience.getState();
  const d = getDestination(ENTRANCE_DESTINATION_ID);
  st.setFloorView(null);
  st.sendNav({ kind: "teleport", level: movementConfig.spawn.level, x: movementConfig.spawn.x, z: movementConfig.spawn.z, ry: movementConfig.spawn.ry });
  st.dispatch({ type: "MOVE" });
  st.sendCamera({ kind: "follow" });
  st.announce(`Back at the ${d?.label ?? "entrance"}.`);
}

/** Preview a floor with the camera (cutaway) without moving the character. */
export function viewFloor(buildingId: BuildingId, level: LevelId) {
  const st = useExperience.getState();
  st.setFloorView({ buildingId, level });
  st.dispatch({ type: "DESELECT" });
  st.sendCamera({ kind: "floor", buildingId, level });
}

/** Walk to the elevator/stairs and ride to another floor. */
export function travelToLevel(buildingId: BuildingId, level: LevelId) {
  const st = useExperience.getState();
  st.setFloorView(null);
  st.sendNav({ kind: "level", buildingId, level });
}

export function enterExperience() {
  const st = useExperience.getState();
  st.dispatch({ type: "ENTER" });
  st.sendCamera({ kind: "overview" });
  st.showHint();
  track("enter_experience");
}
