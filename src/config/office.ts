import type { DestinationCamera, QualityTier } from "@/types/experience";

/**
 * Tunable experience settings. Movement, camera bounds and quality tiers live here so
 * they can be adjusted without touching scene code (PRD FR-03, FR-04, FR-09).
 */
export const movementConfig = {
  /** Walking speed (m/s). */
  walkSpeed: 4.6,
  /** Speed while holding Shift, and for long click-to-move routes. */
  runSpeed: 8.5,
  /** Click-to-move routes longer than this (m) are run instead of walked. */
  autoRunDistance: 18,
  /** Acceleration towards the target velocity (m/s²). */
  acceleration: 28,
  /** Character collision radius (m). */
  radius: 0.35,
  /** Turn rate (rad/s). */
  turnSpeed: 12,
  /** Seconds without progress before a route is abandoned. */
  stuckTimeout: 1.6,
  /** Where the visitor appears (and "Return to entrance"). */
  spawn: { level: "ground" as const, x: 4, z: 34.5, ry: Math.PI },
};

export const cameraConfig = {
  fov: 30,
  near: 0.5,
  far: 900,
  /** Overview framing of the whole campus. */
  overview: { target: [0, 0, -2] as [number, number, number], azimuthDeg: -30, polarDeg: 52, distance: 165 } as const,
  /** Framing used while following the character. */
  follow: { azimuthDeg: -30, polarDeg: 50, distance: 30 } satisfies DestinationCamera,
  minDistance: 9,
  maxDistance: 230,
  minPolarDeg: 22,
  maxPolarDeg: 64,
  /** Camera target must stay inside these bounds. */
  targetBounds: { min: [-72, -1, -58] as [number, number, number], max: [72, 14, 66] as [number, number, number] },
  /** Above this distance the camera stops following and labels switch to overview mode. */
  overviewThreshold: 75,
  smoothTime: 0.32,
  /** Exponential smoothing rate for following the character. */
  followLerp: 7,
  introAutoRotateSpeed: 0.05,
};

export interface QualitySettings {
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  antialias: boolean;
  walkers: boolean;
  environment: boolean;
  animatedWater: boolean;
  /** Screen-space ambient occlusion (post-processing). */
  ambientOcclusion: boolean;
}

export const qualityTiers: Record<QualityTier, QualitySettings> = {
  high: {
    dpr: [1, 1.75],
    shadows: true,
    shadowMapSize: 2048,
    antialias: true,
    walkers: true,
    environment: true,
    animatedWater: true,
    ambientOcclusion: true,
  },
  low: {
    dpr: [1, 1.5],
    shadows: false,
    shadowMapSize: 1024,
    antialias: true,
    walkers: false,
    environment: false,
    animatedWater: false,
    ambientOcclusion: false,
  },
};

export const experienceConfig = {
  /** Show a "still loading" escape hatch after this many ms. */
  loadingTimeoutMs: 15000,
  /** localStorage keys (per-visitor conveniences only). */
  storageKeys: {
    hintDismissed: "cvo.hintDismissed.v1",
    quality: "cvo.quality.v1",
  },
};
