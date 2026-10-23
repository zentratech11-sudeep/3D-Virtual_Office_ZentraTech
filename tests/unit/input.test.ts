import { describe, expect, it } from "vitest";
import { autoQualityTier } from "@/hooks/useDeviceQuality";
import { isEditableTarget, isInsideKeyCapture, shouldIgnoreMovementKey } from "@/lib/input";

const el = (tagName: string, attrs: Record<string, string> = {}, opts: { editable?: boolean; capture?: boolean } = {}) => ({
  tagName,
  isContentEditable: !!opts.editable,
  getAttribute: (n: string) => attrs[n] ?? null,
  closest: (sel: string) => (sel === "[data-capture-keys]" && opts.capture ? {} : null),
});

describe("keyboard input policy", () => {
  it("treats text fields as editable", () => {
    expect(isEditableTarget(el("INPUT"))).toBe(true);
    expect(isEditableTarget(el("INPUT", { type: "email" }))).toBe(true);
    expect(isEditableTarget(el("TEXTAREA"))).toBe(true);
    expect(isEditableTarget(el("SELECT"))).toBe(true);
    expect(isEditableTarget(el("DIV", {}, { editable: true }))).toBe(true);
  });

  it("does not treat buttons, checkboxes or the page as editable", () => {
    expect(isEditableTarget(el("BUTTON"))).toBe(false);
    expect(isEditableTarget(el("INPUT", { type: "checkbox" }))).toBe(false);
    expect(isEditableTarget(el("BODY"))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });

  it("ignores movement keys inside panels that capture the keyboard", () => {
    expect(isInsideKeyCapture(el("BUTTON", {}, { capture: true }))).toBe(true);
    expect(shouldIgnoreMovementKey(el("BUTTON", {}, { capture: true }), false)).toBe(true);
  });

  it("ignores movement while input is locked and allows it otherwise", () => {
    expect(shouldIgnoreMovementKey(el("BODY"), true)).toBe(true);
    expect(shouldIgnoreMovementKey(el("BODY"), false)).toBe(false);
    expect(shouldIgnoreMovementKey(el("INPUT"), false)).toBe(true);
  });
});

describe("automatic quality tier", () => {
  const desktop = { coarsePointer: false, touchPoints: 0, minScreen: 1080, cores: 8, memoryGb: 16, saveData: false };
  it("uses high quality on capable desktops", () => {
    expect(autoQualityTier(desktop)).toBe("high");
  });
  it("uses low quality on phones, low-core/low-memory devices and data saver", () => {
    expect(autoQualityTier({ ...desktop, coarsePointer: true, touchPoints: 5, minScreen: 390 })).toBe("low");
    expect(autoQualityTier({ ...desktop, cores: 4 })).toBe("low");
    expect(autoQualityTier({ ...desktop, memoryGb: 4 })).toBe("low");
    expect(autoQualityTier({ ...desktop, saveData: true })).toBe("low");
  });
});
