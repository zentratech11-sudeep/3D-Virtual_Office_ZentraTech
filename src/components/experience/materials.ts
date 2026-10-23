import * as THREE from "three";
import type { FloorMaterial, MaterialKey } from "@/world/types";
import {
  asphaltTexture,
  carpetTexture,
  deckTexture,
  grassTexture,
  pavingTexture,
  roofTexture,
  screenTexture,
  slatTexture,
  tileTexture,
  woodTexture,
} from "./textures";

/**
 * Shared material registry. Every mesh in the scene draws from these few
 * materials so the renderer can batch state changes (TRD §8).
 */

type Spec = THREE.MeshStandardMaterialParameters & { physical?: false };

const SPECS: Record<MaterialKey, Spec> = {
  wall: { color: "#f3f0ea", roughness: 0.92 },
  wallWarm: { color: "#efe4d4", roughness: 0.92 },
  frame: { color: "#2b323b", roughness: 0.5, metalness: 0.35 },
  frameLight: { color: "#e6e9ec", roughness: 0.6, metalness: 0.1 },
  glass: { color: "#bfe3f2", roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.24, depthWrite: false, envMapIntensity: 1.6 },
  glassFrost: { color: "#eef4f8", roughness: 0.35, metalness: 0, transparent: true, opacity: 0.5, depthWrite: false },
  glassDark: { color: "#4d6b80", roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.6, depthWrite: false },
  woodLight: { color: "#d8b78b", roughness: 0.7 },
  woodMid: { color: "#b6844f", roughness: 0.72 },
  woodDark: { color: "#6b4630", roughness: 0.7 },
  woodSlat: { color: "#ffffff", roughness: 0.75 },
  concrete: { color: "#d7d3cb", roughness: 0.95 },
  metal: { color: "#a2abb3", roughness: 0.32, metalness: 0.75 },
  black: { color: "#22252a", roughness: 0.55, metalness: 0.2 },
  white: { color: "#f7f7f4", roughness: 0.8 },
  accentGreen: { color: "#2e5a4b", roughness: 0.85 },
  accentBlue: { color: "#2f6bff", roughness: 0.6 },
  fabricGray: { color: "#8a9097", roughness: 0.95 },
  fabricLight: { color: "#d8d4cc", roughness: 0.95 },
  fabricBlue: { color: "#4a6fa5", roughness: 0.95 },
  fabricOlive: { color: "#6f7f63", roughness: 0.95 },
  roof: { color: "#4b5560", roughness: 0.85 },
  solar: { color: "#1c3558", roughness: 0.22, metalness: 0.65, envMapIntensity: 1.4 },
  stone: { color: "#c9c2b5", roughness: 0.95 },
  pavingDark: { color: "#8f8a80", roughness: 0.95 },
  hedge: { color: "#4f8f3a", roughness: 0.95 },
  leaf: { color: "#ffffff", roughness: 0.85 },
  pot: { color: "#f1efe9", roughness: 0.6 },
  potDark: { color: "#3a3d42", roughness: 0.6 },
  brandBlue: { color: "#2f6bff", roughness: 0.45, metalness: 0.1 },
  glow: { color: "#fff6dc", emissive: "#ffe9b0", emissiveIntensity: 1.6, roughness: 0.4 },
  screen: { color: "#000000", emissive: "#ffffff", emissiveIntensity: 0.9, roughness: 0.3 },
  tint: { color: "#ffffff", roughness: 0.75 },
};

const materials = new Map<string, THREE.Material>();

export function getMaterial(key: MaterialKey): THREE.MeshStandardMaterial {
  let m = materials.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial(SPECS[key]);
    if (key === "woodSlat") {
      const t = slatTexture().clone();
      t.repeat.set(7, 1);
      t.needsUpdate = true;
      m.map = t;
    }
    if (key === "screen") m.emissiveMap = screenTexture("monitor");
    m.name = key;
    materials.set(key, m);
  }
  return m;
}

/** Cached per-colour materials for characters. */
export function getColorMaterial(hex: string, roughness = 0.8): THREE.MeshStandardMaterial {
  const key = `color:${hex}:${roughness}`;
  let m = materials.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness });
    materials.set(key, m);
  }
  return m;
}

/** Tile size (m) per floor texture repeat, used to generate world-space UVs. */
export const FLOOR_TILE: Record<FloorMaterial, number> = {
  grass: 9,
  paving: 3,
  plaza: 4,
  asphalt: 4,
  tile: 2.2,
  wood: 2.4,
  woodDark: 2.4,
  deck: 2.5,
  carpet: 2,
  carpetBlue: 2,
  carpetWarm: 2,
  carpetSlate: 2,
  poolDeck: 3,
  roofDeck: 3,
};

export function getFloorMaterial(kind: FloorMaterial): THREE.MeshStandardMaterial {
  const key = `floor:${kind}`;
  let m = materials.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    const map =
      kind === "grass"
        ? grassTexture()
        : kind === "paving" || kind === "plaza" || kind === "poolDeck"
          ? pavingTexture(kind)
          : kind === "asphalt"
            ? asphaltTexture()
            : kind === "tile"
              ? tileTexture()
              : kind === "wood"
                ? woodTexture(false)
                : kind === "woodDark"
                  ? woodTexture(true)
                  : kind === "deck"
                    ? deckTexture()
                    : kind === "carpet"
                      ? carpetTexture()
                      : kind === "carpetBlue"
                        ? carpetTexture("#3f5f93")
                        : kind === "carpetWarm"
                          ? carpetTexture("#a8836a")
                          : kind === "carpetSlate"
                            ? carpetTexture("#6c7684")
                      : roofTexture();
    m = new THREE.MeshStandardMaterial({
      map,
      roughness: kind === "wood" || kind === "woodDark" || kind === "tile" ? 0.55 : 0.95,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    m.name = key;
    materials.set(key, m);
  }
  return m;
}

export function disposeMaterials() {
  for (const m of materials.values()) m.dispose();
  materials.clear();
}
