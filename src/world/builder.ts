import type { LevelId, Vec3, VisibilityGroup } from "@/types/experience";
import type {
  AnchorDef,
  BoxDef,
  CharacterLook,
  Collider,
  CutDef,
  FeaturedPersonDef,
  FloorDef,
  LevelDef,
  MaterialKey,
  NpcDef,
  NpcPose,
  PropDef,
  PropType,
  Rect,
  SpecialDef,
  SurfaceDef,
  WorldData,
} from "./types";

/** Deterministic PRNG so the campus is identical on every load (and in tests). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rect = (x0: number, z0: number, x1: number, z1: number): Rect => ({
  x0: Math.min(x0, x1),
  z0: Math.min(z0, z1),
  x1: Math.max(x0, x1),
  z1: Math.max(z0, z1),
});

export const insetRect = (r: Rect, d: number): Rect => ({
  x0: r.x0 + d,
  z0: r.z0 + d,
  x1: r.x1 - d,
  z1: r.z1 - d,
});

export const rectContains = (r: Rect, x: number, z: number, margin = 0) =>
  x >= r.x0 - margin && x <= r.x1 + margin && z >= r.z0 - margin && z <= r.z1 + margin;

export const rectsOverlap = (a: Rect, b: Rect) =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;

const NPC_SHIRTS = ["#1f3a5f", "#27466f", "#e9edf2", "#9cc3e6", "#5f6b78", "#6b7d4f", "#7a3b3b", "#2f6f73", "#2a2e35", "#c8b28f", "#3c5a8a", "#d8dee6"];
const NPC_PANTS = ["#2a2f3a", "#3b4252", "#1f2430", "#4a4f5a", "#5b4a3a", "#2d3b55"];
const NPC_HAIR = ["#1c1a19", "#2e221b", "#4a3324", "#6b4a2f", "#a07850", "#d9b37a", "#5a5a5a", "#141414"];
const NPC_SKIN = ["#f2c9a5", "#e0ac83", "#c68b5e", "#8d5a3b", "#5e3b26", "#f7d7bd", "#d9a27a"];

/** Rotate a local offset (lx, lz) by ry around Y (three.js convention). */
export function rotateXZ(lx: number, lz: number, ry: number): [number, number] {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  return [lx * c + lz * s, -lx * s + lz * c];
}

interface WallOptions {
  group: VisibilityGroup;
  /** Collision layer; omit for purely visual walls. */
  level?: LevelId;
  /** "x": wall runs along X at constant z. "z": runs along Z at constant x. */
  axis: "x" | "z";
  at: number;
  from: number;
  to: number;
  y0: number;
  y1: number;
  thickness?: number;
  m: MaterialKey;
  openings?: Array<[number, number]>;
  cut?: CutDef;
  collide?: boolean;
  /** Collider thickness (defaults to visual thickness, min 0.3). */
  colliderThickness?: number;
}

/** Splits [from, to] by the given openings. */
export function splitSpans(from: number, to: number, openings: Array<[number, number]> = []) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const sorted = [...openings]
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const spans: Array<[number, number]> = [];
  let cursor = lo;
  for (const [a, b] of sorted) {
    if (a > cursor) spans.push([cursor, Math.min(a, hi)]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < hi) spans.push([cursor, hi]);
  return spans.filter(([a, b]) => b - a > 0.01);
}

export class WorldBuilder {
  readonly data: WorldData;
  readonly rng: () => number;

  constructor(bounds: Rect, seed = 20261009) {
    this.rng = mulberry32(seed);
    this.data = {
      bounds,
      levels: {} as Record<LevelId, LevelDef>,
      colliders: { ground: [], "hq-1": [], "hq-roof": [], "mkt-1": [], "sales-1": [] },
      boxes: [],
      props: [],
      floors: [],
      links: [],
      zones: [],
      anchors: [],
      npcs: [],
      featured: [],
      surfaces: [],
      specials: [],
      walkers: [],
      buildings: [],
      mapPaths: [],
      rooms: [],
      seats: [],
      problems: [],
    };
  }

  level(def: LevelDef) {
    this.data.levels[def.id] = def;
  }

  collider(level: LevelId, c: Collider) {
    this.data.colliders[level].push(c);
  }

  rectCollider(level: LevelId, x0: number, z0: number, x1: number, z1: number) {
    const r = rect(x0, z0, x1, z1);
    this.collider(level, { kind: "rect", ...r });
  }

  circleCollider(level: LevelId, x: number, z: number, r: number) {
    this.collider(level, { kind: "circle", x, z, r });
  }

  /** Box from centre + size. */
  box(group: VisibilityGroup, p: Vec3, s: Vec3, m: MaterialKey, extra: Partial<BoxDef> = {}) {
    const b: BoxDef = { group, p, s, m, ...extra };
    this.data.boxes.push(b);
    return b;
  }

  /** Box from min/max corners. */
  boxMinMax(
    group: VisibilityGroup,
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    m: MaterialKey,
    extra: Partial<BoxDef> = {},
  ) {
    return this.box(
      group,
      [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
      [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)],
      m,
      extra,
    );
  }

  /** Axis-aligned wall with optional openings; also emits colliders. */
  wall(o: WallOptions) {
    const t = o.thickness ?? 0.3;
    const ct = Math.max(o.colliderThickness ?? t, 0.3);
    for (const [a, b] of splitSpans(o.from, o.to, o.openings)) {
      if (o.axis === "x") {
        this.boxMinMax(o.group, a, o.y0, o.at - t / 2, b, o.y1, o.at + t / 2, o.m, { cut: o.cut });
        if (o.level && o.collide !== false) this.rectCollider(o.level, a, o.at - ct / 2, b, o.at + ct / 2);
      } else {
        this.boxMinMax(o.group, o.at - t / 2, o.y0, a, o.at + t / 2, o.y1, b, o.m, { cut: o.cut });
        if (o.level && o.collide !== false) this.rectCollider(o.level, o.at - ct / 2, a, o.at + ct / 2, b);
      }
    }
  }

  /** Vertical mullions/piers spaced along a wall, skipping openings. */
  mullions(
    group: VisibilityGroup,
    axis: "x" | "z",
    at: number,
    from: number,
    to: number,
    y0: number,
    y1: number,
    spacing: number,
    m: MaterialKey,
    width = 0.12,
    depth = 0.16,
    openings: Array<[number, number]> = [],
    cut?: CutDef,
  ) {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const n = Math.max(1, Math.round((hi - lo) / spacing));
    const step = (hi - lo) / n;
    for (let i = 0; i <= n; i++) {
      const v = lo + i * step;
      if (openings.some(([a, b]) => v > Math.min(a, b) - 0.05 && v < Math.max(a, b) + 0.05)) continue;
      if (axis === "x") this.box(group, [v, (y0 + y1) / 2, at], [width, y1 - y0, depth], m, { cut });
      else this.box(group, [at, (y0 + y1) / 2, v], [depth, y1 - y0, width], m, { cut });
    }
  }

  prop(type: PropType, group: VisibilityGroup, p: Vec3, ry = 0, extra: Partial<PropDef> = {}) {
    const d: PropDef = { type, group, p, ry, ...extra };
    this.data.props.push(d);
    return d;
  }

  floor(def: FloorDef) {
    this.data.floors.push(def);
  }

  surface(def: SurfaceDef) {
    this.data.surfaces.push(def);
  }

  special(def: SpecialDef) {
    this.data.specials.push(def);
  }

  anchor(def: AnchorDef) {
    this.data.anchors.push(def);
  }

  featured(def: FeaturedPersonDef) {
    this.data.featured.push(def);
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.rng() * list.length) % list.length];
  }

  npc(pose: NpcPose, group: VisibilityGroup, p: Vec3, ry: number, look: Partial<CharacterLook> = {}) {
    const d: NpcDef = {
      pose,
      group,
      p,
      ry,
      shirt: look.shirt ?? this.pick(NPC_SHIRTS),
      pants: look.pants ?? this.pick(NPC_PANTS),
      hair: look.hair ?? this.pick(NPC_HAIR),
      skin: look.skin ?? this.pick(NPC_SKIN),
    };
    this.data.npcs.push(d);
    return d;
  }

  randomLook(): CharacterLook {
    return {
      shirt: this.pick(NPC_SHIRTS),
      pants: this.pick(NPC_PANTS),
      hair: this.pick(NPC_HAIR),
      skin: this.pick(NPC_SKIN),
      hairStyle: this.rng() > 0.6 ? "long" : "short",
    };
  }

  /**
   * A bank of desks facing each other (two rows of `cols` desks) with chairs,
   * monitors and optional seated people. Rotation must be a multiple of PI/2.
   * Returns the collider rectangle (world space) for anchors.
   */
  deskCluster(
    level: LevelId,
    group: VisibilityGroup,
    cx: number,
    cz: number,
    y: number,
    opts: { ry?: number; occupancy?: number; desk?: "woodLight" | "white" } = {},
  ): Rect {
    const cols = 3;
    const ry = opts.ry ?? 0;
    const occupancy = opts.occupancy ?? 0.7;
    const deskW = 1.4;
    const halfSpan = (cols * deskW) / 2;
    for (let row = 0; row < 2; row++) {
      // Row 0 sits on the north side (-z) facing south (+z), row 1 mirrored.
      // Props face +z at ry = 0, so row 0 people/chairs use ry and desks/monitors are flipped.
      const side = row === 0 ? -1 : 1;
      const facing = row === 0 ? 0 : Math.PI;
      const deskRy = ry + (row === 0 ? Math.PI : 0);
      for (let c = 0; c < cols; c++) {
        const lx = -halfSpan + deskW / 2 + c * deskW;
        const [dx, dz] = rotateXZ(lx, side * 0.4, ry);
        this.prop("desk", group, [cx + dx, y, cz + dz], deskRy, {
          color: opts.desk === "white" ? "#f2f2f0" : undefined,
        });
        const [mx, mz] = rotateXZ(lx, side * 0.18, ry);
        this.prop("monitor", group, [cx + mx, y + 0.76, cz + mz], deskRy);
        const [chx, chz] = rotateXZ(lx, side * 1.12, ry);
        const chairRy = ry + facing;
        this.prop("deskChair", group, [cx + chx, y, cz + chz], chairRy);
        if (this.rng() < occupancy) {
          const [px, pz] = rotateXZ(lx, side * 1.02, ry);
          this.npc("sit", group, [cx + px, y, cz + pz], chairRy);
        }
      }
    }
    const [hx, hz] = rotateXZ(halfSpan + 0.1, 1.5, ry);
    this.prop("partition", group, [cx, y, cz], ry);
    const r = rect(cx - Math.abs(hx), cz - Math.abs(hz), cx + Math.abs(hx), cz + Math.abs(hz));
    this.rectCollider(level, r.x0, r.z0, r.x1, r.z1);
    return r;
  }

  /** Two sofas facing each other around a coffee table. */
  loungeSet(
    level: LevelId,
    group: VisibilityGroup,
    cx: number,
    cz: number,
    y: number,
    opts: { ry?: number; fabric?: string; people?: number; gap?: number } = {},
  ): Rect {
    const ry = opts.ry ?? 0;
    const gap = opts.gap ?? 1.7;
    const [ax, az] = rotateXZ(0, -gap, ry);
    const [bx, bz] = rotateXZ(0, gap, ry);
    this.prop("sofa", group, [cx + ax, y, cz + az], ry, { color: opts.fabric });
    this.prop("sofa", group, [cx + bx, y, cz + bz], ry + Math.PI, { color: opts.fabric });
    this.prop("coffeeTable", group, [cx, y, cz], ry);
    const people = opts.people ?? 0;
    for (let i = 0; i < people; i++) {
      const sideSign = i % 2 === 0 ? -1 : 1;
      const lx = (i < 2 ? -0.45 : 0.45) * (i % 2 === 0 ? 1 : -1);
      const [px, pz] = rotateXZ(lx, sideSign * (gap - 0.12), ry);
      this.npc("sit", group, [cx + px, y + 0.02, cz + pz], ry + (sideSign < 0 ? 0 : Math.PI));
    }
    const [hx, hz] = rotateXZ(1.25, gap + 0.55, ry);
    const r = rect(cx - Math.abs(hx), cz - Math.abs(hz), cx + Math.abs(hx), cz + Math.abs(hz));
    this.rectCollider(level, r.x0, r.z0, r.x1, r.z1);
    return r;
  }

  /** Long table with chairs on both sides (meeting/studio). */
  meetingTable(
    level: LevelId,
    group: VisibilityGroup,
    cx: number,
    cz: number,
    y: number,
    opts: { length: number; ry?: number; people?: number; ends?: boolean },
  ): Rect {
    const ry = opts.ry ?? 0;
    const L = opts.length;
    this.special({ id: `table-${cx}-${cz}`, kind: "table", group, p: [cx, y, cz], ry, size: [L, 0.76, 1.6] });
    const perSide = Math.max(2, Math.floor(L / 1.2));
    const step = L / perSide;
    let seated = 0;
    const want = opts.people ?? 0;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < perSide; i++) {
        const lx = -L / 2 + step / 2 + i * step;
        const [x, z] = rotateXZ(lx, side * 1.15, ry);
        const chairRy = ry + (side < 0 ? 0 : Math.PI);
        this.prop("meetingChair", group, [cx + x, y, cz + z], chairRy);
        if (seated < want && this.rng() < 0.75) {
          const [px, pz] = rotateXZ(lx, side * 1.05, ry);
          this.npc("sit", group, [cx + px, y, cz + pz], chairRy);
          seated++;
        }
      }
    }
    if (opts.ends) {
      for (const side of [-1, 1]) {
        const [x, z] = rotateXZ(side * (L / 2 + 0.75), 0, ry);
        this.prop("meetingChair", group, [cx + x, y, cz + z], ry + (side < 0 ? Math.PI / 2 : -Math.PI / 2));
      }
    }
    const [hx, hz] = rotateXZ(L / 2 + (opts.ends ? 1.2 : 0.3), 1.6, ry);
    const r = rect(cx - Math.abs(hx), cz - Math.abs(hz), cx + Math.abs(hx), cz + Math.abs(hz));
    this.rectCollider(level, r.x0, r.z0, r.x1, r.z1);
    return r;
  }

  plant(level: LevelId | undefined, group: VisibilityGroup, x: number, z: number, y: number, type: PropType = "plantTall", scale = 1) {
    this.prop(type, group, [x, y, z], this.rng() * Math.PI * 2, { scale });
    if (level) this.circleCollider(level, x, z, 0.38 * scale);
  }
}
