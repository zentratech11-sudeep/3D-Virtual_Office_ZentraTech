import type * as THREE from "three";
import type { NpcPose } from "@/world/types";
import { G, type Part, mergeParts } from "./geometry";

/**
 * Stylised low-poly people (≈1.8 m tall), facing +Z. Used for instanced background
 * staff; the animated rig in CharacterModel.tsx shares these proportions.
 */

export type PersonSlot = "skin" | "shirt" | "pants" | "hair" | "shoes";
export const PERSON_SLOTS: PersonSlot[] = ["skin", "shirt", "pants", "hair", "shoes"];

export const BODY = {
  hipY: 0.9,
  legX: 0.095,
  shoulderX: 0.215,
  shoulderY: 1.45,
  torsoY: 1.2,
  headY: 1.675,
};

function standing(slot: PersonSlot): Part[] {
  switch (slot) {
    case "skin":
      return [
        { geometry: G.cyl(0.048, 0.05, 0.1, 0, 1.545, 0, 8), material: "tint" },
        { geometry: G.sphere(0.112, 0, BODY.headY, 0, 1, 1.1, 1.02), material: "tint" },
        { geometry: G.sphere(0.052, -0.235, 0.875, 0.01), material: "tint" },
        { geometry: G.sphere(0.052, 0.235, 0.875, 0.01), material: "tint" },
      ];
    case "shirt":
      return [
        { geometry: G.capsule(0.165, 0.3, 0, BODY.torsoY, 0, 0, 0, 1.08, 1, 0.66), material: "tint" },
        { geometry: G.capsule(0.046, 0.46, -0.225, 1.18, 0, 0, -0.06), material: "tint" },
        { geometry: G.capsule(0.046, 0.46, 0.225, 1.18, 0, 0, 0.06), material: "tint" },
      ];
    case "pants":
      return [
        { geometry: G.box(0.32, 0.16, 0.2, 0, 0.93, 0), material: "tint" },
        { geometry: G.capsule(0.072, 0.68, -BODY.legX, 0.48, 0), material: "tint" },
        { geometry: G.capsule(0.072, 0.68, BODY.legX, 0.48, 0), material: "tint" },
      ];
    case "hair":
      return [{ geometry: G.cap(0.122, 0, 1.69, -0.01, -0.3, Math.PI * 0.55, 1.02, 1, 1.06), material: "tint" }];
    case "shoes":
      return [
        { geometry: G.box(0.1, 0.07, 0.24, -BODY.legX, 0.035, 0.035), material: "black" },
        { geometry: G.box(0.1, 0.07, 0.24, BODY.legX, 0.035, 0.035), material: "black" },
      ];
  }
}

const SIT_DROP = 0.42;

function sitting(slot: PersonSlot): Part[] {
  const d = SIT_DROP;
  switch (slot) {
    case "skin":
      return [
        { geometry: G.cyl(0.048, 0.05, 0.1, 0, 1.545 - d, 0, 8), material: "tint" },
        { geometry: G.sphere(0.112, 0, BODY.headY - d, 0, 1, 1.1, 1.02), material: "tint" },
        { geometry: G.sphere(0.052, -0.215, BODY.shoulderY - d - 0.31, 0.49), material: "tint" },
        { geometry: G.sphere(0.052, 0.215, BODY.shoulderY - d - 0.31, 0.49), material: "tint" },
      ];
    case "shirt":
      return [
        { geometry: G.capsule(0.165, 0.3, 0, BODY.torsoY - d, 0, 0, 0, 1.08, 1, 0.66), material: "tint" },
        { geometry: G.capsule(0.046, 0.46, -0.215, BODY.shoulderY - d - 0.146, 0.227, -1.0), material: "tint" },
        { geometry: G.capsule(0.046, 0.46, 0.215, BODY.shoulderY - d - 0.146, 0.227, -1.0), material: "tint" },
      ];
    case "pants":
      return [
        { geometry: G.box(0.32, 0.16, 0.24, 0, 0.51, 0.02), material: "tint" },
        { geometry: G.capsule(0.074, 0.3, -BODY.legX, 0.5, 0.2, Math.PI / 2), material: "tint" },
        { geometry: G.capsule(0.074, 0.3, BODY.legX, 0.5, 0.2, Math.PI / 2), material: "tint" },
        { geometry: G.capsule(0.066, 0.34, -BODY.legX, 0.27, 0.4), material: "tint" },
        { geometry: G.capsule(0.066, 0.34, BODY.legX, 0.27, 0.4), material: "tint" },
      ];
    case "hair":
      return [{ geometry: G.cap(0.122, 0, 1.69 - d, -0.01, -0.3, Math.PI * 0.55, 1.02, 1, 1.06), material: "tint" }];
    case "shoes":
      return [
        { geometry: G.box(0.1, 0.07, 0.24, -BODY.legX, 0.035, 0.47), material: "black" },
        { geometry: G.box(0.1, 0.07, 0.24, BODY.legX, 0.035, 0.47), material: "black" },
      ];
  }
}

const cache = new Map<string, THREE.BufferGeometry>();

export function getPersonGeometry(pose: NpcPose, slot: PersonSlot): THREE.BufferGeometry {
  const key = `${pose}:${slot}`;
  let g = cache.get(key);
  if (!g) {
    const parts = mergeParts(pose === "sit" ? sitting(slot) : standing(slot));
    g = parts[0].geometry;
    cache.set(key, g);
  }
  return g;
}

/* Individual limb geometries for the animated rig (pivot-relative). */
const limbCache = new Map<string, THREE.BufferGeometry>();
function limb(key: string, make: () => THREE.BufferGeometry) {
  let g = limbCache.get(key);
  if (!g) {
    g = make();
    g.computeBoundingSphere();
    limbCache.set(key, g);
  }
  return g;
}

export const rigGeometry = {
  /** Leg hanging from the hip pivot. */
  leg: () => limb("leg", () => G.capsule(0.072, 0.68, 0, -0.42, 0)),
  shoe: () => limb("shoe", () => G.box(0.1, 0.07, 0.24, 0, -BODY.hipY + 0.035, 0.035)),
  hips: () => limb("hips", () => G.box(0.32, 0.16, 0.2, 0, 0.93, 0)),
  /** Torso relative to the hip pivot (y = hipY). */
  torso: () => limb("torso", () => G.capsule(0.165, 0.3, 0, BODY.torsoY - BODY.hipY, 0, 0, 0, 1.08, 1, 0.66)),
  jacketCollar: () => limb("collar", () => G.box(0.14, 0.12, 0.05, 0, 1.47 - BODY.hipY, 0.1)),
  neck: () => limb("neck", () => G.cyl(0.048, 0.05, 0.1, 0, 1.545 - BODY.hipY, 0, 8)),
  head: () => limb("head", () => G.sphere(0.112, 0, BODY.headY - BODY.hipY, 0, 1, 1.1, 1.02)),
  hair: () => limb("hair", () => G.cap(0.122, 0, 1.69 - BODY.hipY, -0.01, -0.3, Math.PI * 0.55, 1.02, 1, 1.06)),
  hairLong: () => limb("hairLong", () => G.box(0.22, 0.28, 0.08, 0, 1.58 - BODY.hipY, -0.085)),
  hairBun: () => limb("hairBun", () => G.sphere(0.06, 0, 1.79 - BODY.hipY, -0.1)),
  backpack: () => limb("backpack", () => G.box(0.28, 0.36, 0.14, 0, 1.24 - BODY.hipY, -0.17)),
  /** Arm hanging from the shoulder pivot. */
  arm: () => limb("arm", () => G.capsule(0.046, 0.46, 0, -0.27, 0)),
  hand: () => limb("hand", () => G.sphere(0.052, 0, -0.575, 0.01)),
};
