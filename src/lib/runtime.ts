import { movementConfig } from "@/config/office";
import type { LevelId } from "@/types/experience";

/**
 * Transient, per-frame state shared between the scene and the HTML interface.
 * Deliberately NOT React state: it changes every frame and is read imperatively
 * (mini-map, labels) to avoid re-rendering React 60 times a second (PRD §8).
 */
export const runtime = {
  player: {
    level: movementConfig.spawn.level as LevelId,
    x: movementConfig.spawn.x,
    z: movementConfig.spawn.z,
    y: 0,
    ry: movementConfig.spawn.ry,
    speed: 0,
  },
  camera: {
    azimuth: 0,
    polar: 0,
    distance: 0,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    /** True while the camera rig is following the character. */
    following: false,
  },
  input: {
    keys: new Set<string>(),
    /** Virtual joystick vector, x = right, y = forward, magnitude 0..1. */
    joystick: { x: 0, y: 0 },
  },
  stats: { fps: 0, calls: 0, triangles: 0 },
  /** Projects a world point to CSS pixels (set by the scene once the camera exists). */
  project: null as null | ((x: number, y: number, z: number) => { x: number; y: number; visible: boolean }),
};

type Listener = () => void;
const frameListeners = new Set<Listener>();

/** Subscribe to (throttled) runtime updates. Returns an unsubscribe function. */
export function onRuntimeFrame(listener: Listener) {
  frameListeners.add(listener);
  return () => {
    frameListeners.delete(listener);
  };
}

export function emitRuntimeFrame() {
  for (const l of frameListeners) l();
}

export function resetInput() {
  runtime.input.keys.clear();
  runtime.input.joystick.x = 0;
  runtime.input.joystick.y = 0;
}
