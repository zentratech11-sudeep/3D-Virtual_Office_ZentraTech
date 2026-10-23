import { describe, expect, it } from "vitest";
import { type MachineEvent, type MachineState, experienceReducer, initialMachineState, isInputLocked } from "@/lib/experience-machine";

const run = (events: MachineEvent[], from: MachineState = initialMachineState) => events.reduce(experienceReducer, from);

describe("experience state machine", () => {
  it("loads, shows the intro and enters the overview", () => {
    const s1 = run([{ type: "SCENE_READY" }]);
    expect(s1.mode).toBe("intro");
    expect(isInputLocked(s1)).toBe(true);
    const s2 = experienceReducer(s1, { type: "ENTER" });
    expect(s2.mode).toBe("overview");
    expect(isInputLocked(s2)).toBe(false);
  });

  it("ignores movement before the visitor enters", () => {
    expect(run([{ type: "MOVE" }]).mode).toBe("loading");
    expect(run([{ type: "SCENE_READY" }, { type: "MOVE" }]).mode).toBe("intro");
  });

  it("switches to walking on movement and back to overview through a camera transition", () => {
    const walking = run([{ type: "SCENE_READY" }, { type: "ENTER" }, { type: "MOVE" }]);
    expect(walking.mode).toBe("walking");
    const transitioning = experienceReducer(walking, { type: "OVERVIEW" });
    expect(transitioning.mode).toBe("cameraTransition");
    expect(experienceReducer(transitioning, { type: "TRANSITION_END" }).mode).toBe("overview");
  });

  it("selects and deselects objects, returning to the previous explore mode", () => {
    const walking = run([{ type: "SCENE_READY" }, { type: "ENTER" }, { type: "MOVE" }]);
    const selected = experienceReducer(walking, { type: "SELECT", contentId: "reception", anchorId: "anchor-reception" });
    expect(selected.mode).toBe("objectSelected");
    expect(selected.selectedContentId).toBe("reception");
    const back = experienceReducer(selected, { type: "DESELECT" });
    expect(back.mode).toBe("walking");
    expect(back.selectedContentId).toBeNull();
  });

  it("closes the selection when the visitor starts walking", () => {
    const s = run([{ type: "SCENE_READY" }, { type: "ENTER" }, { type: "SELECT", contentId: "plant" }, { type: "MOVE" }]);
    expect(s.mode).toBe("walking");
    expect(s.selectedContentId).toBeNull();
  });

  it("keeps the selection through a camera transition", () => {
    const s = run([{ type: "SCENE_READY" }, { type: "ENTER" }, { type: "SELECT", contentId: "plant" }, { type: "TRANSITION_START" }, { type: "TRANSITION_END" }]);
    expect(s.mode).toBe("objectSelected");
    expect(s.selectedContentId).toBe("plant");
  });

  it("locks scene input while a modal is open and restores the mode afterwards", () => {
    const selected = run([{ type: "SCENE_READY" }, { type: "ENTER" }, { type: "SELECT", contentId: "meeting-room" }]);
    const modal = experienceReducer(selected, { type: "OPEN_MODAL", modal: "contact" });
    expect(modal.mode).toBe("panelOpen");
    expect(isInputLocked(modal)).toBe(true);
    // Movement is ignored while the modal captures the keyboard.
    expect(experienceReducer(modal, { type: "MOVE" }).mode).toBe("panelOpen");
    const closed = experienceReducer(modal, { type: "CLOSE_MODAL" });
    expect(closed.mode).toBe("objectSelected");
    expect(closed.modal).toBeNull();
  });

  it("allows the 2D content modal during loading without changing the mode", () => {
    const s = run([{ type: "OPEN_MODAL", modal: "company" }]);
    expect(s.mode).toBe("loading");
    expect(s.modal).toBe("company");
    expect(isInputLocked(s)).toBe(true);
  });

  it("falls back on scene failure from any mode and can retry", () => {
    const s = run([{ type: "SCENE_READY" }, { type: "ENTER" }, { type: "MOVE" }, { type: "SCENE_FAILED", reason: "context lost" }]);
    expect(s.mode).toBe("errorFallback");
    expect(s.error).toBe("context lost");
    expect(experienceReducer(s, { type: "RETRY" }).mode).toBe("loading");
  });
});
