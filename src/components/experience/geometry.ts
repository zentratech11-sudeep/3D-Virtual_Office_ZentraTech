import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MaterialKey } from "@/world/types";

/** Small helpers that build transformed, non-indexed primitives ready for merging. */

const tmp = new THREE.Object3D();

function place(g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  tmp.position.set(x, y, z);
  tmp.rotation.set(rx, ry, rz);
  tmp.scale.set(sx, sy, sz);
  tmp.updateMatrix();
  g.applyMatrix4(tmp.matrix);
  const out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  // Keep a consistent attribute set for merging.
  for (const name of Object.keys(out.attributes)) {
    if (name !== "position" && name !== "normal" && name !== "uv") out.deleteAttribute(name);
  }
  if (!out.attributes.uv) {
    out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((out.attributes.position.count * 2) | 0), 2));
  }
  return out;
}

export const G = {
  box: (w: number, h: number, d: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => place(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz),
  cyl: (rt: number, rb: number, h: number, x = 0, y = 0, z = 0, seg = 12, rx = 0, ry = 0, rz = 0) =>
    place(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, rx, ry, rz),
  sphere: (r: number, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ws = 12, hs = 9) => place(new THREE.SphereGeometry(r, ws, hs), x, y, z, 0, 0, 0, sx, sy, sz),
  cap: (r: number, x = 0, y = 0, z = 0, rx = 0, thetaLen = Math.PI * 0.55, sx = 1, sy = 1, sz = 1) =>
    place(new THREE.SphereGeometry(r, 12, 7, 0, Math.PI * 2, 0, thetaLen), x, y, z, rx, 0, 0, sx, sy, sz),
  ico: (r: number, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, detail = 1) => place(new THREE.IcosahedronGeometry(r, detail), x, y, z, 0, 0, 0, sx, sy, sz),
  capsule: (r: number, len: number, x = 0, y = 0, z = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    place(new THREE.CapsuleGeometry(r, len, 4, 10), x, y, z, rx, 0, rz, sx, sy, sz),
  cone: (r: number, h: number, x = 0, y = 0, z = 0, seg = 16) => place(new THREE.ConeGeometry(r, h, seg), x, y, z),
};

export interface Part {
  geometry: THREE.BufferGeometry;
  material: MaterialKey;
  /** Default instance colour for tinted parts (material "tint" / "leaf"). */
  tint?: string;
  castShadow?: boolean;
}

/** Merges parts that share a material + tint into single geometries. */
export function mergeParts(parts: Part[]): Part[] {
  const groups = new Map<string, Part[]>();
  for (const p of parts) {
    const key = `${p.material}|${p.tint ?? ""}|${p.castShadow === false ? 0 : 1}`;
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  const out: Part[] = [];
  for (const list of groups.values()) {
    const geometry = list.length === 1 ? list[0].geometry : mergeGeometries(list.map((p) => p.geometry), false);
    if (!geometry) throw new Error("Failed to merge prop geometry");
    geometry.computeBoundingSphere();
    out.push({ geometry, material: list[0].material, tint: list[0].tint, castShadow: list[0].castShadow });
  }
  return out;
}
