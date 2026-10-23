import type { LevelId, Vec2 } from "@/types/experience";
import type { Rect, WorldData } from "@/world/types";
import { type CollisionLayer, hasLineOfSight, insideWalkable } from "./collision";

/**
 * Click-to-move navigation. Each level gets a coarse occupancy grid rasterised from the
 * same colliders used for movement, A* finds a route, and string-pulling smooths it.
 * Levels are joined by authored elevator/stairs links.
 */

export interface NavGrid {
  level: LevelId;
  x0: number;
  z0: number;
  cell: number;
  cols: number;
  rows: number;
  /** 1 = blocked. */
  blocked: Uint8Array;
}

export interface NavPoint {
  level: LevelId;
  x: number;
  z: number;
}

export interface NavLeg {
  level: LevelId;
  points: Vec2[];
}

export interface NavPlan {
  legs: NavLeg[];
  /** Link used between leg i and leg i + 1. */
  links: string[];
  length: number;
}

function boundsOf(rects: Rect[]): Rect {
  return rects.reduce(
    (acc, r) => ({ x0: Math.min(acc.x0, r.x0), z0: Math.min(acc.z0, r.z0), x1: Math.max(acc.x1, r.x1), z1: Math.max(acc.z1, r.z1) }),
    { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity },
  );
}

export function buildNavGrid(level: LevelId, layer: CollisionLayer, radius: number, cell = 0.5): NavGrid {
  const b = boundsOf(layer.walkable);
  const cols = Math.ceil((b.x1 - b.x0) / cell);
  const rows = Math.ceil((b.z1 - b.z0) / cell);
  const blocked = new Uint8Array(cols * rows).fill(1);
  const centre = (i: number, origin: number) => origin + (i + 0.5) * cell;

  // Free the walkable rectangles (shrunk by the radius).
  for (const r of layer.walkable) {
    const c0 = Math.max(0, Math.floor((r.x0 + radius - b.x0) / cell));
    const c1 = Math.min(cols - 1, Math.ceil((r.x1 - radius - b.x0) / cell));
    const r0 = Math.max(0, Math.floor((r.z0 + radius - b.z0) / cell));
    const r1 = Math.min(rows - 1, Math.ceil((r.z1 - radius - b.z0) / cell));
    for (let rz = r0; rz <= r1; rz++) {
      const z = centre(rz, b.z0);
      for (let cx = c0; cx <= c1; cx++) {
        const x = centre(cx, b.x0);
        if (insideWalkable([r], x, z, radius)) blocked[rz * cols + cx] = 0;
      }
    }
  }
  // Rasterise inflated obstacles.
  for (const c of layer.colliders) {
    const pad = radius + 0.02;
    const ex0 = (c.kind === "rect" ? c.x0 : c.x - c.r) - pad;
    const ex1 = (c.kind === "rect" ? c.x1 : c.x + c.r) + pad;
    const ez0 = (c.kind === "rect" ? c.z0 : c.z - c.r) - pad;
    const ez1 = (c.kind === "rect" ? c.z1 : c.z + c.r) + pad;
    const c0 = Math.max(0, Math.floor((ex0 - b.x0) / cell));
    const c1 = Math.min(cols - 1, Math.floor((ex1 - b.x0) / cell));
    const r0 = Math.max(0, Math.floor((ez0 - b.z0) / cell));
    const r1 = Math.min(rows - 1, Math.floor((ez1 - b.z0) / cell));
    for (let rz = r0; rz <= r1; rz++) {
      const z = centre(rz, b.z0);
      for (let cx = c0; cx <= c1; cx++) {
        const x = centre(cx, b.x0);
        let inside: boolean;
        if (c.kind === "rect") {
          const dx = Math.max(c.x0 - x, 0, x - c.x1);
          const dz = Math.max(c.z0 - z, 0, z - c.z1);
          inside = dx * dx + dz * dz < pad * pad;
        } else inside = Math.hypot(x - c.x, z - c.z) < c.r + pad;
        if (inside) blocked[rz * cols + cx] = 1;
      }
    }
  }
  return { level, x0: b.x0, z0: b.z0, cell, cols, rows, blocked };
}

const cellOf = (g: NavGrid, x: number, z: number): [number, number] => [
  Math.floor((x - g.x0) / g.cell),
  Math.floor((z - g.z0) / g.cell),
];
const cellCentre = (g: NavGrid, cx: number, rz: number): Vec2 => [g.x0 + (cx + 0.5) * g.cell, g.z0 + (rz + 0.5) * g.cell];
const isFree = (g: NavGrid, cx: number, rz: number) =>
  cx >= 0 && rz >= 0 && cx < g.cols && rz < g.rows && g.blocked[rz * g.cols + cx] === 0;

/** Nearest free cell centre within `maxDist` metres (breadth-first ring search). */
export function nearestFreeCell(g: NavGrid, x: number, z: number, maxDist = 3): Vec2 | null {
  const [cx, rz] = cellOf(g, x, z);
  if (isFree(g, cx, rz)) return cellCentre(g, cx, rz);
  const maxRing = Math.ceil(maxDist / g.cell);
  let best: Vec2 | null = null;
  let bestD = Infinity;
  for (let ring = 1; ring <= maxRing; ring++) {
    for (let dz = -ring; dz <= ring; dz++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        if (!isFree(g, cx + dx, rz + dz)) continue;
        const c = cellCentre(g, cx + dx, rz + dz);
        const d = Math.hypot(c[0] - x, c[1] - z);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
    }
    if (best && bestD <= ring * g.cell) return best;
  }
  return best && bestD <= maxDist ? best : null;
}

class MinHeap {
  private items: number[] = [];
  private prio: number[] = [];
  get size() {
    return this.items.length;
  }
  push(item: number, p: number) {
    const items = this.items;
    const prio = this.prio;
    items.push(item);
    prio.push(p);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (prio[parent] <= prio[i]) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      [prio[parent], prio[i]] = [prio[i], prio[parent]];
      i = parent;
    }
  }
  pop(): number {
    const items = this.items;
    const prio = this.prio;
    const top = items[0];
    const lastItem = items.pop()!;
    const lastPrio = prio.pop()!;
    if (items.length > 0) {
      items[0] = lastItem;
      prio[0] = lastPrio;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && prio[l] < prio[m]) m = l;
        if (r < items.length && prio[r] < prio[m]) m = r;
        if (m === i) break;
        [items[m], items[i]] = [items[i], items[m]];
        [prio[m], prio[i]] = [prio[i], prio[m]];
        i = m;
      }
    }
    return top;
  }
}

/** A* over the grid; returns cell centres from start to goal (inclusive) or null. */
export function astar(g: NavGrid, start: Vec2, goal: Vec2): Vec2[] | null {
  const [sx, sz] = cellOf(g, start[0], start[1]);
  const [gx, gz] = cellOf(g, goal[0], goal[1]);
  if (!isFree(g, sx, sz) || !isFree(g, gx, gz)) return null;
  const n = g.cols * g.rows;
  const gScore = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const startIdx = sz * g.cols + sx;
  const goalIdx = gz * g.cols + gx;
  const h = (cx: number, rz: number) => {
    const dx = Math.abs(cx - gx);
    const dz = Math.abs(rz - gz);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  };
  const open = new MinHeap();
  gScore[startIdx] = 0;
  open.push(startIdx, h(sx, sz));
  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ] as const;
  while (open.size > 0) {
    const cur = open.pop();
    if (cur === goalIdx) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % g.cols;
    const rz = (cur - cx) / g.cols;
    for (const [dx, dz, cost] of dirs) {
      const nx = cx + dx;
      const nz = rz + dz;
      if (!isFree(g, nx, nz)) continue;
      // No corner cutting.
      if (dx !== 0 && dz !== 0 && (!isFree(g, cx + dx, rz) || !isFree(g, cx, rz + dz))) continue;
      const ni = nz * g.cols + nx;
      if (closed[ni]) continue;
      const tentative = gScore[cur] + cost;
      if (tentative < gScore[ni]) {
        gScore[ni] = tentative;
        came[ni] = cur;
        open.push(ni, tentative + h(nx, nz));
      }
    }
  }
  if (startIdx !== goalIdx && came[goalIdx] === -1) return null;
  const cells: Vec2[] = [];
  for (let i = goalIdx; i !== -1; i = came[i]) {
    const cx = i % g.cols;
    cells.push(cellCentre(g, cx, (i - cx) / g.cols));
    if (i === startIdx) break;
  }
  return cells.reverse();
}

/** Removes intermediate points that have a clear straight line between their neighbours. */
export function smoothPath(layer: CollisionLayer, points: Vec2[], radius: number): Vec2[] {
  if (points.length <= 2) return points;
  const out: Vec2[] = [points[0]];
  let anchor = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const next = points[i + 1];
    if (!hasLineOfSight(layer, anchor[0], anchor[1], next[0], next[1], radius)) {
      out.push(points[i]);
      anchor = points[i];
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export function pathLength(points: Vec2[]) {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return d;
}

export class Navigator {
  private grids = new Map<LevelId, NavGrid>();

  constructor(
    readonly world: WorldData,
    readonly radius: number,
  ) {}

  layer(level: LevelId): CollisionLayer {
    return { colliders: this.world.colliders[level], walkable: this.world.levels[level].walkable };
  }

  grid(level: LevelId): NavGrid {
    let g = this.grids.get(level);
    if (!g) {
      g = buildNavGrid(level, this.layer(level), this.radius);
      this.grids.set(level, g);
    }
    return g;
  }

  /** Snaps a point to the nearest reachable spot on a level, or null if none is close. */
  snap(level: LevelId, x: number, z: number, maxDist = 3): Vec2 | null {
    const g = this.grid(level);
    const [cx, rz] = cellOf(g, x, z);
    if (isFree(g, cx, rz) && insideWalkable(this.layer(level).walkable, x, z, this.radius)) return [x, z];
    return nearestFreeCell(g, x, z, maxDist);
  }

  /** Path on a single level. */
  pathOnLevel(level: LevelId, from: Vec2, to: Vec2): Vec2[] | null {
    const g = this.grid(level);
    const layer = this.layer(level);
    const start = nearestFreeCell(g, from[0], from[1], 2) ?? from;
    const goal = this.snap(level, to[0], to[1]);
    if (!goal) return null;
    if (hasLineOfSight(layer, from[0], from[1], goal[0], goal[1], this.radius)) return [from, goal];
    const cells = astar(g, start, goal);
    if (!cells) return null;
    cells[0] = from;
    cells[cells.length - 1] = goal;
    return smoothPath(layer, cells, this.radius * 0.98);
  }

  /** Sequence of (link, fromLevel, toLevel) hops between two levels (BFS). */
  levelHops(from: LevelId, to: LevelId) {
    if (from === to) return [];
    type Hop = { linkId: string; from: LevelId; to: LevelId };
    const prev = new Map<LevelId, Hop>();
    const queue: LevelId[] = [from];
    const seen = new Set<LevelId>([from]);
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === to) break;
      for (const link of this.world.links) {
        if (!link.stops.some((s) => s.level === cur)) continue;
        for (const s of link.stops) {
          if (seen.has(s.level)) continue;
          seen.add(s.level);
          prev.set(s.level, { linkId: link.id, from: cur, to: s.level });
          queue.push(s.level);
        }
      }
    }
    if (!prev.has(to)) return null;
    const hops: Hop[] = [];
    for (let l: LevelId = to; l !== from; ) {
      const h = prev.get(l)!;
      hops.push(h);
      l = h.from;
    }
    return hops.reverse();
  }

  /** Full route, possibly across levels via elevators/stairs. */
  plan(from: NavPoint, to: NavPoint): NavPlan | null {
    const hops = this.levelHops(from.level, to.level);
    if (!hops) return null;
    const legs: NavLeg[] = [];
    const links: string[] = [];
    let cursor: NavPoint = from;
    for (const hop of hops) {
      const link = this.world.links.find((l) => l.id === hop.linkId)!;
      const a = link.stops.find((s) => s.level === hop.from)!;
      const b = link.stops.find((s) => s.level === hop.to)!;
      const leg = this.pathOnLevel(cursor.level, [cursor.x, cursor.z], [a.x, a.z]);
      if (!leg) return null;
      legs.push({ level: cursor.level, points: leg });
      links.push(link.id);
      cursor = { level: b.level, x: b.x, z: b.z };
    }
    const last = this.pathOnLevel(cursor.level, [cursor.x, cursor.z], [to.x, to.z]);
    if (!last) return null;
    legs.push({ level: cursor.level, points: last });
    return { legs, links, length: legs.reduce((d, l) => d + pathLength(l.points), 0) };
  }
}
