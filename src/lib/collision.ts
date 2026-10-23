import type { Collider, Rect } from "@/world/types";

/**
 * 2D (XZ-plane) collision for a circular character against axis-aligned rectangles
 * and circles, bounded by a union of walkable rectangles. Pure functions — no three.js.
 */

export interface CollisionLayer {
  colliders: Collider[];
  walkable: Rect[];
}

export function insideWalkable(walkable: Rect[], x: number, z: number, radius: number) {
  for (const r of walkable) {
    if (x >= r.x0 + radius && x <= r.x1 - radius && z >= r.z0 + radius && z <= r.z1 - radius) return true;
  }
  return false;
}

/** Distance from a point to a collider surface (negative when inside). */
export function distanceToCollider(c: Collider, x: number, z: number): number {
  if (c.kind === "circle") return Math.hypot(x - c.x, z - c.z) - c.r;
  const dx = Math.max(c.x0 - x, 0, x - c.x1);
  const dz = Math.max(c.z0 - z, 0, z - c.z1);
  if (dx === 0 && dz === 0) {
    return -Math.min(x - c.x0, c.x1 - x, z - c.z0, c.z1 - z);
  }
  return Math.hypot(dx, dz);
}

export function overlapsAny(colliders: Collider[], x: number, z: number, radius: number) {
  for (const c of colliders) if (distanceToCollider(c, x, z) < radius - 1e-6) return true;
  return false;
}

/** Pushes a circle out of a single collider. Returns the corrected position. */
function pushOut(c: Collider, x: number, z: number, radius: number): [number, number] {
  if (c.kind === "circle") {
    const dx = x - c.x;
    const dz = z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + radius;
    if (d >= min) return [x, z];
    if (d < 1e-6) return [c.x + min, z];
    const k = min / d;
    return [c.x + dx * k, c.z + dz * k];
  }
  const cx = Math.min(Math.max(x, c.x0), c.x1);
  const cz = Math.min(Math.max(z, c.z0), c.z1);
  const dx = x - cx;
  const dz = z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 > 1e-12) {
    if (d2 >= radius * radius) return [x, z];
    const d = Math.sqrt(d2);
    const k = (radius - d) / d;
    return [x + dx * k, z + dz * k];
  }
  // Centre inside the rectangle: exit through the nearest side.
  const left = x - c.x0;
  const right = c.x1 - x;
  const top = z - c.z0;
  const bottom = c.z1 - z;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return [c.x0 - radius, z];
  if (m === right) return [c.x1 + radius, z];
  if (m === top) return [x, c.z0 - radius];
  return [x, c.z1 + radius];
}

export function resolvePosition(colliders: Collider[], x: number, z: number, radius: number): [number, number] {
  let px = x;
  let pz = z;
  for (let iter = 0; iter < 4; iter++) {
    let moved = false;
    for (const c of colliders) {
      // Cheap reject.
      if (c.kind === "rect") {
        if (px < c.x0 - radius || px > c.x1 + radius || pz < c.z0 - radius || pz > c.z1 + radius) continue;
      } else if (Math.abs(px - c.x) > c.r + radius || Math.abs(pz - c.z) > c.r + radius) continue;
      const [nx, nz] = pushOut(c, px, pz, radius);
      if (nx !== px || nz !== pz) {
        px = nx;
        pz = nz;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return [px, pz];
}

/**
 * Moves a circle by (dx, dz), sliding along obstacles and staying inside the
 * walkable area. Large steps are sub-stepped so thin walls cannot be tunnelled.
 */
export function moveWithCollision(
  layer: CollisionLayer,
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius: number,
): [number, number] {
  const dist = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(dist / (radius * 0.45)));
  let px = x;
  let pz = z;
  for (let i = 0; i < steps; i++) {
    const sx = dx / steps;
    const sz = dz / steps;
    let [nx, nz] = resolvePosition(layer.colliders, px + sx, pz + sz, radius);
    if (!insideWalkable(layer.walkable, nx, nz, radius) || overlapsAny(layer.colliders, nx, nz, radius * 0.98)) {
      // Slide along a single axis.
      const [ax, az] = resolvePosition(layer.colliders, px + sx, pz, radius);
      const [bx, bz] = resolvePosition(layer.colliders, px, pz + sz, radius);
      const aOk = insideWalkable(layer.walkable, ax, az, radius) && !overlapsAny(layer.colliders, ax, az, radius * 0.98);
      const bOk = insideWalkable(layer.walkable, bx, bz, radius) && !overlapsAny(layer.colliders, bx, bz, radius * 0.98);
      if (aOk && (!bOk || Math.abs(sx) >= Math.abs(sz))) [nx, nz] = [ax, az];
      else if (bOk) [nx, nz] = [bx, bz];
      else [nx, nz] = [px, pz];
    }
    px = nx;
    pz = nz;
  }
  return [px, pz];
}

/** Segment vs. rectangle expanded by `pad` (slab test). */
function segmentHitsRect(x0: number, z0: number, x1: number, z1: number, r: Rect, pad: number) {
  const minX = r.x0 - pad;
  const maxX = r.x1 + pad;
  const minZ = r.z0 - pad;
  const maxZ = r.z1 + pad;
  let tmin = 0;
  let tmax = 1;
  const dx = x1 - x0;
  const dz = z1 - z0;
  if (Math.abs(dx) < 1e-9) {
    if (x0 < minX || x0 > maxX) return false;
  } else {
    let t1 = (minX - x0) / dx;
    let t2 = (maxX - x0) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dz) < 1e-9) {
    if (z0 < minZ || z0 > maxZ) return false;
  } else {
    let t1 = (minZ - z0) / dz;
    let t2 = (maxZ - z0) / dz;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

function segmentHitsCircle(x0: number, z0: number, x1: number, z1: number, cx: number, cz: number, r: number) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len2 = dx * dx + dz * dz;
  let t = len2 > 0 ? ((cx - x0) * dx + (cz - z0) * dz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = x0 + dx * t;
  const pz = z0 + dz * t;
  return Math.hypot(px - cx, pz - cz) < r;
}

/** True when a circle of `radius` can travel straight from A to B. */
export function hasLineOfSight(layer: CollisionLayer, ax: number, az: number, bx: number, bz: number, radius: number) {
  const minX = Math.min(ax, bx) - radius;
  const maxX = Math.max(ax, bx) + radius;
  const minZ = Math.min(az, bz) - radius;
  const maxZ = Math.max(az, bz) + radius;
  for (const c of layer.colliders) {
    if (c.kind === "rect") {
      if (c.x1 < minX || c.x0 > maxX || c.z1 < minZ || c.z0 > maxZ) continue;
      if (segmentHitsRect(ax, az, bx, bz, c, radius)) return false;
    } else {
      if (c.x + c.r < minX || c.x - c.r > maxX || c.z + c.r < minZ || c.z - c.r > maxZ) continue;
      if (segmentHitsCircle(ax, az, bx, bz, c.x, c.z, c.r + radius)) return false;
    }
  }
  // Sample the walkable bound along the segment.
  const len = Math.hypot(bx - ax, bz - az);
  const samples = Math.max(2, Math.ceil(len / 0.5));
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    if (!insideWalkable(layer.walkable, ax + (bx - ax) * t, az + (bz - az) * t, radius)) return false;
  }
  return true;
}
