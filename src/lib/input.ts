/**
 * Keyboard input policy (PRD FR-03 / TRD §2): movement keys never act while the visitor is
 * typing or while a panel captures the keyboard. Pure helpers so they can be unit tested.
 */

export const MOVEMENT_CODES = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"]);

interface ElementLike {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
  getAttribute?: (name: string) => string | null;
}

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** True for text inputs, textareas, selects and contenteditable regions. */
export function isEditableTarget(target: unknown): boolean {
  const el = target as ElementLike | null;
  if (!el || typeof el !== "object") return false;
  if (el.isContentEditable) return true;
  const tag = (el.tagName ?? "").toUpperCase();
  if (tag === "INPUT") {
    const type = (el.getAttribute?.("type") ?? "text").toLowerCase();
    return !["checkbox", "radio", "button", "submit", "reset", "range", "color"].includes(type);
  }
  return EDITABLE_TAGS.has(tag);
}

/** True when the target sits inside a dialog/panel that captures keyboard input. */
export function isInsideKeyCapture(target: unknown): boolean {
  const el = target as ElementLike | null;
  if (!el || typeof el.closest !== "function") return false;
  return !!el.closest("[data-capture-keys]");
}

export function shouldIgnoreMovementKey(target: unknown, inputLocked: boolean): boolean {
  return inputLocked || isEditableTarget(target) || isInsideKeyCapture(target);
}
