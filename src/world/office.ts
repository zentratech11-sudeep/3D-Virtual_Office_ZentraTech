import type { BuildingId, LevelId, Vec2, Vec3, VisibilityGroup } from "@/types/experience";
import type { Department, Fixture, OfficeLayout, PartitionConfig, Person, Project, RoomConfig, Side } from "@/types/organization";
import { type WorldBuilder, rect, rectContains, rotateXZ } from "./builder";
import type { CharacterLook, MaterialKey, Rect, RoomDef, SeatDef } from "./types";

/**
 * Builds office interiors from data (src/data/office-layout.ts + organization.ts):
 * partitions with doors, room floors, furniture fixtures, workstations (seats), the
 * people sitting at them, clickable hotspots and location zones. Pure TypeScript.
 */

export interface OfficeContext {
  layout: OfficeLayout;
  people: readonly Person[];
  departments: readonly Department[];
  caseStudies: readonly Project[];
  groupOf: (buildingId: BuildingId, level: LevelId) => VisibilityGroup;
  /** Clear interior height of a storey (partition / wall-panel height). */
  storeyHeight: (buildingId: BuildingId, level: LevelId) => number;
  /** Doors in the building shells (entrances), attached to the room they open into. */
  exteriorDoors: Array<{ level: LevelId; x: number; z: number; axis: "x" | "z"; width: number }>;
}

const PI = Math.PI;
const HALF_PI = PI / 2;

interface RoomCtx {
  b: WorldBuilder;
  room: RoomConfig;
  r: Rect;
  level: LevelId;
  group: VisibilityGroup;
  /** Elevation of the storey floor. */
  elev: number;
  /** Y for furniture standing on the floor finish. */
  fy: number;
  /** Y of the room's floor surface. */
  floorY: number;
  height: number;
  accent: string;
  seats: SeatDef[];
  dept?: Department;
  ctx: OfficeContext;
}

const seatFacing = (fromX: number, fromZ: number, toX: number, toZ: number) => Math.atan2(toX - fromX, toZ - fromZ);

/* ------------------------------------------------------------------------------------------------
 * Looks: deterministic, varied staff appearance (overridable per person)
 * ---------------------------------------------------------------------------------------------- */
const SHIRTS = ["#1f3a5f", "#27466f", "#e9edf2", "#9cc3e6", "#5f6b78", "#6b7d4f", "#7a3b3b", "#2f6f73", "#2a2e35", "#c8b28f", "#3c5a8a", "#d8dee6"];
const PANTS = ["#2a2f3a", "#3b4252", "#1f2430", "#4a4f5a", "#5b4a3a", "#2d3b55"];
const HAIR = ["#1c1a19", "#2e221b", "#4a3324", "#6b4a2f", "#a07850", "#d9b37a", "#5a5a5a", "#141414"];
const SKIN = ["#f2c9a5", "#e0ac83", "#c68b5e", "#8d5a3b", "#5e3b26", "#f7d7bd", "#d9a27a"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function lookFor(person: Person): CharacterLook {
  const h = hash(person.id);
  const pick = <T>(list: T[], salt: number) => list[(h >>> salt) % list.length];
  return {
    shirt: pick(SHIRTS, 0),
    pants: pick(PANTS, 4),
    hair: pick(HAIR, 8),
    skin: pick(SKIN, 12),
    hairStyle: ((h >>> 16) % 3 === 0 ? "long" : "short") as CharacterLook["hairStyle"],
    ...person.look,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------------------------- */
/** Point on the inner face of a room wall, facing into the room. */
function mount(r: Rect, side: Side, at: number, inset: number) {
  switch (side) {
    case "n":
      return { x: at, z: r.z0 + inset, ry: 0, axis: "x" as const };
    case "s":
      return { x: at, z: r.z1 - inset, ry: PI, axis: "x" as const };
    case "w":
      return { x: r.x0 + inset, z: at, ry: HALF_PI, axis: "z" as const };
    case "e":
      return { x: r.x1 - inset, z: at, ry: -HALF_PI, axis: "z" as const };
  }
}

/** Thin board on a wall (backing for screens, signs, art). */
function wallBoard(c: RoomCtx, side: Side, from: number, to: number, y0: number, y1: number, m: MaterialKey, depth = 0.18, color?: string) {
  const { b, r, group } = c;
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const extra = color ? { color } : {};
  if (side === "n") b.boxMinMax(group, lo, y0, r.z0, hi, y1, r.z0 + depth, m, extra);
  else if (side === "s") b.boxMinMax(group, lo, y0, r.z1 - depth, hi, y1, r.z1, m, extra);
  else if (side === "w") b.boxMinMax(group, r.x0, y0, lo, r.x0 + depth, y1, hi, m, extra);
  else b.boxMinMax(group, r.x1 - depth, y0, lo, r.x1, y1, hi, m, extra);
}

function wallHit(c: RoomCtx, side: Side, at: number, w: number, y: number, h: number, depth = 0.6): { p: Vec3; s: Vec3 } {
  const m = mount(c.r, side, at, depth / 2);
  return m.axis === "x" ? { p: [m.x, y, m.z], s: [w, h, depth] } : { p: [m.x, y, m.z], s: [depth, h, w] };
}

/** Walkable spot in front of a wall item. */
function wallApproach(c: RoomCtx, side: Side, at: number, dist = 1.8): Vec2 {
  const m = mount(c.r, side, at, dist);
  return [m.x, m.z];
}

let anchorCounter = 0;
function roomAnchor(c: RoomCtx, hit: { p: Vec3; s: Vec3 }, approach: Vec2, contentId = c.room.id, idHint = "room") {
  c.b.anchor({ id: `anchor-${idHint}-${c.room.id.replace(/^room-/, "")}-${anchorCounter++}`, contentId, level: c.level, group: c.group, p: hit.p, s: hit.s, approach });
}

function addSeat(c: RoomCtx, seat: Omit<SeatDef, "id" | "roomId" | "index" | "level" | "group">) {
  const index = c.seats.length;
  const s: SeatDef = { id: `${c.room.id}#${index}`, roomId: c.room.id, index, level: c.level, group: c.group, ...seat };
  c.seats.push(s);
  return s;
}

/* ------------------------------------------------------------------------------------------------
 * Seat-creating fixtures
 * ---------------------------------------------------------------------------------------------- */
function deskAccessories(c: RoomCtx, x: number, z: number, deskRy: number, dual: boolean) {
  const { b, group, fy } = c;
  const roll = b.rng();
  const [ax, az] = rotateXZ(0.5, 0.12, deskRy);
  if (roll < 0.35) b.prop("plantSmall", group, [x + ax, fy + 0.76, z + az], b.rng() * PI);
  else if (roll < 0.75) b.prop("mug", group, [x + ax, fy + 0.76, z + az], 0);
  if (dual && b.rng() < 0.7) {
    const [mx, mz] = rotateXZ(-0.42, -0.2, deskRy);
    b.prop("monitor", group, [x + mx, fy + 0.76, z + mz], deskRy + 0.35);
  }
}

function deskCluster(c: RoomCtx, f: Extract<Fixture, { type: "deskCluster" }>) {
  const { b, group, fy, level } = c;
  const [cx, cz] = f.at;
  const ry = f.ry ?? 0;
  const tint = f.desk === "white" ? "#f2f2f0" : undefined;
  const dual = c.room.departmentId === "dept-engineering";
  const swap = Math.abs(Math.sin(ry)) > 0.5;
  for (let row = 0; row < 2; row++) {
    const side = row === 0 ? -1 : 1;
    const facing = ry + (row === 0 ? 0 : PI);
    const deskRy = ry + (row === 0 ? PI : 0);
    for (let col = 0; col < 3; col++) {
      const lx = -1.4 + col * 1.4;
      const at = (lz: number) => {
        const [dx, dz] = rotateXZ(lx, lz, ry);
        return [cx + dx, cz + dz] as const;
      };
      const [dx, dz] = at(side * 0.4);
      b.prop("desk", group, [dx, fy, dz], deskRy, { color: tint });
      const [mx, mz] = at(side * 0.18);
      b.prop("monitor", group, [mx, fy + 0.76, mz], deskRy);
      deskAccessories(c, dx, dz, deskRy, dual);
      const [chx, chz] = at(side * 1.12);
      b.prop("deskChair", group, [chx, fy, chz], facing);
      const [sx, sz] = at(side * 1.02);
      const [tx, tz] = at(side * 1.85);
      const [ax, az] = at(side * 2.3);
      const [hx, hz] = at(side * 0.75);
      addSeat(c, {
        kind: "desk",
        sit: [sx, fy, sz, facing],
        stand: [tx, fy, tz, facing],
        approach: [ax, az],
        hit: { p: [hx, fy + 0.65, hz], s: swap ? [1.5, 1.3, 1.4] : [1.4, 1.3, 1.5] },
      });
    }
  }
  b.prop("partition", group, [cx, fy, cz], ry);
  const [hx, hz] = rotateXZ(2.2, 1.5, ry);
  b.rectCollider(level, cx - Math.abs(hx), cz - Math.abs(hz), cx + Math.abs(hx), cz + Math.abs(hz));
}

function workstations(c: RoomCtx, f: Extract<Fixture, { type: "workstations" }>) {
  const { b, group, fy, level } = c;
  const spacing = f.spacing ?? 2;
  const [x0, zd] = f.from;
  for (let i = 0; i < f.count; i++) {
    const x = x0 + i * spacing;
    const tint = i % 3 === 1 ? "#f2f2f0" : i % 3 === 2 ? "#c9a274" : undefined;
    b.prop("desk", group, [x, fy, zd], PI, { color: tint });
    b.prop("monitor", group, [x, fy + 0.76, zd + 0.18], PI);
    deskAccessories(c, x, zd, PI, false);
    b.prop("deskChair", group, [x, fy, zd - 0.72], (b.rng() - 0.5) * 0.4);
    // Low privacy screen at the front and side panels between desks.
    b.boxMinMax(group, x - 0.7, fy + 0.74, zd + 0.34, x + 0.7, fy + 1.16, zd + 0.38, "frameLight");
    b.boxMinMax(group, x - spacing / 2 - 0.02, fy, zd - 0.36, x - spacing / 2 + 0.02, fy + 1.16, zd + 0.38, "frameLight");
    addSeat(c, {
      kind: "desk",
      sit: [x, fy, zd - 0.62, 0],
      stand: [x + 0.55, fy, zd - 1.42, seatFacing(x + 0.55, zd - 1.42, x, zd)],
      approach: [x - 0.2, zd - 1.95],
      hit: { p: [x, fy + 0.65, zd - 0.35], s: [1.5, 1.3, 1.5] },
    });
  }
  const xN = x0 + (f.count - 1) * spacing;
  b.boxMinMax(group, xN + spacing / 2 - 0.02, fy, zd - 0.36, xN + spacing / 2 + 0.02, fy + 1.16, zd + 0.38, "frameLight");
  b.rectCollider(level, x0 - spacing / 2 - 0.05, zd - 1.1, xN + spacing / 2 + 0.05, zd + 0.42);
}

function leadDesk(c: RoomCtx, f: Extract<Fixture, { type: "leadDesk" }>) {
  const { b, group, fy, level } = c;
  const [x, z] = f.at;
  b.prop("desk", group, [x, fy, z], PI, { color: "#c9a274" });
  b.prop("monitor", group, [x - 0.25, fy + 0.76, z + 0.18], PI);
  b.prop("monitor", group, [x + 0.38, fy + 0.76, z + 0.12], PI - 0.35);
  b.prop("plantSmall", group, [x - 0.55, fy + 0.76, z - 0.1], 0);
  b.prop("deskChair", group, [x, fy, z - 0.72], 0);
  b.boxMinMax(group, x + 0.72, fy, z - 0.3, x + 1.32, fy + 0.72, z + 0.35, "white");
  b.boxMinMax(group, x + 0.7, fy + 0.72, z - 0.32, x + 1.34, fy + 0.76, z + 0.37, "woodLight");
  b.rectCollider(level, x - 0.8, z - 1.1, x + 1.4, z + 0.4);
  addSeat(c, {
    kind: "desk",
    sit: [x, fy, z - 0.62, 0],
    stand: [x + 1.0, fy, z - 1.45, seatFacing(x + 1.0, z - 1.45, x, z)],
    approach: [x + 0.2, z + 1.25],
    hit: { p: [x + 0.2, fy + 0.65, z - 0.35], s: [2.0, 1.3, 1.5] },
  });
}

function worktable(c: RoomCtx, f: Extract<Fixture, { type: "worktable" }>) {
  const { b, group, fy, level } = c;
  const [cx, cz] = f.at;
  const ry = f.ry ?? 0;
  const L = f.length;
  b.special({ id: `worktable-${c.room.id}-${cx}-${cz}`, kind: "table", group, p: [cx, fy, cz], ry, size: [L, 0.76, 1.6] });
  const perSide = Math.max(2, Math.floor(L / 1.2));
  const step = L / perSide;
  for (const side of [-1, 1]) {
    for (let i = 0; i < perSide; i++) {
      const lx = -L / 2 + step / 2 + i * step;
      const at = (lz: number) => {
        const [dx, dz] = rotateXZ(lx, lz, ry);
        return [cx + dx, cz + dz] as const;
      };
      const facing = ry + (side < 0 ? 0 : PI);
      const [chx, chz] = at(side * 1.15);
      b.prop("meetingChair", group, [chx, fy, chz], facing);
      if (b.rng() < 0.5) {
        const [lx2, lz2] = at(side * 0.45);
        b.prop(b.rng() < 0.5 ? "mug" : "plantSmall", group, [lx2, fy + 0.79, lz2], 0);
      }
      const [sx, sz] = at(side * 1.05);
      const [tx, tz] = at(side * 1.8);
      const [ax, az] = at(side * 2.25);
      const [hx, hz] = at(side * 0.85);
      addSeat(c, { kind: "desk", sit: [sx, fy, sz, facing], stand: [tx, fy, tz, facing], approach: [ax, az], hit: { p: [hx, fy + 0.65, hz], s: [1.0, 1.3, 1.1] } });
    }
  }
  const [hx, hz] = rotateXZ(L / 2 + 0.3, 1.6, ry);
  b.rectCollider(level, cx - Math.abs(hx), cz - Math.abs(hz), cx + Math.abs(hx), cz + Math.abs(hz));
}

function execDesk(c: RoomCtx, f: Extract<Fixture, { type: "execDesk" }>) {
  const { b, group, fy, level } = c;
  const [x, z] = f.at;
  b.special({ id: `exec-desk-${c.room.id}`, kind: "execDesk", group, p: [x, fy, z], ry: 0, size: [2.4, 0.76, 1.1] });
  b.prop("monitor", group, [x - 0.45, fy + 0.78, z - 0.25], PI);
  b.prop("plantSmall", group, [x + 0.85, fy + 0.78, z - 0.2], 0);
  b.prop("mug", group, [x + 0.35, fy + 0.78, z + 0.05], 0);
  b.boxMinMax(group, x - 0.25, fy + 0.78, z + 0.38, x + 0.25, fy + 0.86, z + 0.44, "brandBlue");
  b.prop("deskChair", group, [x, fy, z - 0.95], 0);
  for (const dx of [-0.6, 0.6]) {
    b.prop("meetingChair", group, [x + dx, fy, z + 1.15], PI);
    b.circleCollider(level, x + dx, z + 1.15, 0.3);
  }
  b.rectCollider(level, x - 1.3, z - 1.4, x + 1.3, z + 0.6);
  addSeat(c, {
    kind: "host",
    sit: [x, fy, z - 0.85, 0],
    stand: [x + 1.85, fy, z - 0.5, -0.64],
    approach: [x - 1.9, z + 1.1],
    hit: { p: [x, fy + 0.6, z - 0.3], s: [2.6, 1.2, 1.8] },
  });
}

function receptionDesk(c: RoomCtx, f: Extract<Fixture, { type: "receptionDesk" }>) {
  const { b, group, fy, level } = c;
  const [x, z] = f.at;
  const w = f.width ?? 5;
  b.special({ id: `reception-desk-${c.room.id}`, kind: "receptionDesk", group, p: [x, fy - 0.03, z], ry: 0, size: [w, 1.1, 1] });
  b.rectCollider(level, x - w / 2 - 0.25, z - 0.7, x + w / 2 + 0.25, z + 0.7);
  roomAnchor(c, { p: [x, fy + 0.65, z], s: [w + 0.4, 1.3, 1.4] }, [x - 0.6, z + 1.7]);
  addSeat(c, {
    kind: "host",
    sit: [x + 0.9, fy, z - 1.35, 0],
    stand: [x + 0.9, fy, z - 1.35, 0],
    approach: [x + 0.9, z + 1.5],
    hit: { p: [x + 0.9, fy + 0.95, z - 1.35], s: [0.9, 1.9, 0.9] },
  });
}

/* ------------------------------------------------------------------------------------------------
 * Decor fixtures
 * ---------------------------------------------------------------------------------------------- */
function buildFixture(c: RoomCtx, f: Fixture) {
  const { b, group, fy, level, r, elev, height } = c;
  switch (f.type) {
    case "deskCluster":
      return deskCluster(c, f);
    case "workstations":
      return workstations(c, f);
    case "leadDesk":
      return leadDesk(c, f);
    case "worktable":
      return worktable(c, f);
    case "execDesk":
      return execDesk(c, f);
    case "receptionDesk":
      return receptionDesk(c, f);
    case "conferenceTable": {
      const t = b.meetingTable(level, group, f.at[0], f.at[1], fy, { length: f.length, people: 0, ends: true });
      roomAnchor(c, { p: [f.at[0], fy + 0.6, f.at[1]], s: [t.x1 - t.x0, 1.2, t.z1 - t.z0] }, [t.x0 - 0.8, f.at[1] - 2.2]);
      return;
    }
    case "logoWall": {
      b.wall({ group, level, axis: "x", at: f.z, from: f.from, to: f.to, y0: elev, y1: elev + height, thickness: 0.4, m: "woodSlat" });
      const cx = (f.from + f.to) / 2;
      b.surface({ id: `logo-${c.room.id}`, kind: "logoWall", group, p: [cx, elev + 2.35, f.z + 0.22], ry: 0, w: 5.2, h: 1.9 });
      roomAnchor(c, { p: [cx - 2.6, elev + 2.3, f.z], s: [3.6, 3.2, 0.7] }, [cx - 1.2, f.z + 4.3]);
      return;
    }
    case "lounge": {
      const ry = f.ry ?? 0;
      const gap = f.gap ?? 1.6;
      b.loungeSet(level, group, f.at[0], f.at[1], fy, { ry, fabric: f.fabric, gap, people: 0 });
      for (let i = 0; i < (f.visitors ?? 0); i++) {
        const sideSign = i % 2 === 0 ? -1 : 1;
        const [px, pz] = rotateXZ(i < 2 ? -0.45 : 0.45, sideSign * (gap - 0.12), ry);
        const x = f.at[0] + px;
        const z = f.at[1] + pz;
        b.npc("sit", group, [x, fy + 0.02, z], ry + (sideSign < 0 ? 0 : PI));
        const [ox, oz] = rotateXZ(0, sideSign * (gap + 0.95), ry);
        roomAnchor(c, { p: [x, fy + 0.7, z], s: [0.9, 1.4, 0.9] }, [f.at[0] + ox, f.at[1] + oz], "visitor", "visitor");
      }
      return;
    }
    case "huddle": {
      const chairs = f.chairs ?? 3;
      b.special({ id: `huddle-${c.room.id}-${f.at[0]}-${f.at[1]}`, kind: "roundTable", group, p: [f.at[0], fy, f.at[1]], ry: 0, size: [1.1, 0.74, 1.1] });
      for (let i = 0; i < chairs; i++) {
        const a = (i / chairs) * PI * 2;
        b.prop("meetingChair", group, [f.at[0] + Math.sin(a) * 1.05, fy, f.at[1] + Math.cos(a) * 1.05], a + PI);
      }
      b.circleCollider(level, f.at[0], f.at[1], 1.45);
      return;
    }
    case "plant": {
      const scale = f.scale ?? 1;
      b.plant(level, group, f.at[0], f.at[1], fy, f.variant === "bush" ? "plantBush" : "plantTall", scale);
      if (f.contentId) roomAnchor(c, { p: [f.at[0], fy + 1.1, f.at[1]], s: [1.2, 2.3, 1.2] }, [f.at[0] - 0.15, f.at[1] + 1.25], f.contentId, "plant");
      return;
    }
    case "bench": {
      const ry = f.ry ?? 0;
      b.prop("bench", group, [f.at[0], fy, f.at[1]], ry);
      const [hx, hz] = rotateXZ(1.0, 0.45, ry);
      b.rectCollider(level, f.at[0] - Math.abs(hx), f.at[1] - Math.abs(hz), f.at[0] + Math.abs(hx), f.at[1] + Math.abs(hz));
      return;
    }
    case "bookshelves": {
      const ry = f.facing === "n" ? PI : 0;
      for (let i = 0; i < f.count; i++) b.prop("bookshelf", group, [f.from[0] + i * 1.95, fy, f.from[1]], ry);
      b.rectCollider(level, f.from[0] - 1.0, f.from[1] - 0.3, f.from[0] + (f.count - 1) * 1.95 + 1.0, f.from[1] + 0.3);
      return;
    }
    case "cabinets": {
      const [x0, z] = f.from;
      for (let i = 0; i < f.count; i++) {
        const x = x0 + i * 0.9;
        b.boxMinMax(group, x - 0.43, fy, z - 0.24, x + 0.43, fy + 1.05, z + 0.24, "white");
        b.boxMinMax(group, x - 0.45, fy + 1.05, z - 0.26, x + 0.45, fy + 1.09, z + 0.26, "woodLight");
        b.boxMinMax(group, x - 0.3, fy + 0.52, z + 0.24, x + 0.3, fy + 0.55, z + 0.26, "frame");
      }
      b.rectCollider(level, x0 - 0.45, z - 0.26, x0 + (f.count - 1) * 0.9 + 0.45, z + 0.26);
      return;
    }
    case "wallPanel": {
      const finish = f.finish ?? "accent";
      wallBoard(c, f.side, f.from, f.to, elev, elev + height - 0.05, finish === "wood" ? "woodSlat" : finish === "white" ? "wall" : "tint", 0.2, finish === "accent" ? c.accent : undefined);
      const mid = (f.from + f.to) / 2;
      roomAnchor(c, wallHit(c, f.side, mid, Math.abs(f.to - f.from), elev + height * 0.55, height * 0.8), wallApproach(c, f.side, mid, 2.2));
      return;
    }
    case "screen": {
      const w = f.w ?? 2.2;
      const h = w * 0.58;
      const y = elev + Math.min(1.95, height * 0.5);
      wallBoard(c, f.side, f.at - w / 2 - 0.1, f.at + w / 2 + 0.1, y - h / 2 - 0.12, y + h / 2 + 0.12, "frame", 0.24);
      const m = mount(r, f.side, f.at, 0.25);
      b.surface({ id: `screen-${c.room.id}-${f.side}-${f.at}`, kind: f.kind ?? "tv", group, p: [m.x, y, m.z], ry: m.ry, w, h, variant: f.variant ?? 0, emissive: true });
      return;
    }
    case "sign": {
      const text = (f.text ?? c.dept?.name ?? c.room.name).toUpperCase();
      const w = f.w ?? 4;
      const m = mount(r, f.side, f.at, 0.22);
      b.surface({ id: `sign-${c.room.id}-${f.side}-${f.at}`, kind: "sign", group, p: [m.x, elev + height - 0.55, m.z], ry: m.ry, w, h: w / 8, text, variant: 0 });
      roomAnchor(c, wallHit(c, f.side, f.at, w, elev + height - 0.55, 0.9), wallApproach(c, f.side, f.at, 2.2));
      return;
    }
    case "whiteboard":
    case "moodboard":
    case "art": {
      const w = f.w ?? 2;
      const h = f.type === "art" ? w * 0.7 : f.type === "moodboard" ? w * 0.32 : w * 0.47;
      const y = elev + (f.type === "art" ? 1.8 : 1.7);
      wallBoard(c, f.side, f.at - w / 2 - 0.08, f.at + w / 2 + 0.08, y - h / 2 - 0.08, y + h / 2 + 0.08, f.type === "art" ? "woodDark" : "wall", 0.2);
      const m = mount(r, f.side, f.at, 0.21);
      b.surface({ id: `${f.type}-${c.room.id}-${f.at}`, kind: f.type, group, p: [m.x, y, m.z], ry: m.ry, w, h, variant: f.type === "art" ? f.variant ?? 0 : 0 });
      if (f.type === "moodboard") roomAnchor(c, wallHit(c, f.side, f.at, w + 0.4, y, h + 0.6), wallApproach(c, f.side, f.at, 2.2));
      return;
    }
    case "rug": {
      const [x0, z0, x1, z1] = f.rect;
      b.floor({ id: `rug-${c.room.id}-${x0}-${z0}`, level, group, rect: rect(x0, z0, x1, z1), y: c.floorY + 0.008, material: f.finish ?? "carpetWarm", walkable: true });
      return;
    }
    case "pendants": {
      const n = f.count ?? 3;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        b.prop("pendant", group, [f.at[0] - f.length / 2 + t * f.length, elev + height - 1.25, f.at[1]], 0);
      }
      return;
    }
    case "totems": {
      const spacing = f.spacing ?? 2.55;
      const list = c.ctx.caseStudies;
      const x0 = f.at[0] - ((list.length - 1) * spacing) / 2;
      const z = f.at[1];
      list.forEach((p, i) => {
        const x = x0 + i * spacing;
        b.boxMinMax(group, x - 1.2, fy, z - 0.16, x + 1.2, elev + 3.2, z + 0.16, "frame");
        b.boxMinMax(group, x - 1.3, fy, z - 0.35, x + 1.3, fy + 0.15, z + 0.35, "white");
        b.surface({ id: `project-${p.id}`, kind: "project", group, p: [x, elev + 1.95, z + 0.175], ry: 0, w: 2.2, h: 1.32, variant: i, emissive: true });
        b.anchor({ id: `anchor-${p.id}`, contentId: p.id, level, group, p: [x, elev + 1.7, z + 0.1], s: [2.4, 3.2, 0.7], approach: [x, z + 2.2] });
      });
      if (list.length) {
        b.rectCollider(level, x0 - 1.35, z - 0.4, x0 + (list.length - 1) * spacing + 1.35, z + 0.4);
        b.surface({ id: `gallery-sign-${c.room.id}`, kind: "sign", group, p: [f.at[0], elev + 2.95, z + 0.175], ry: 0, w: 4.6, h: 0.32, text: "SELECTED WORK", variant: 2 });
      }
      return;
    }
    case "timeline": {
      const m = mount(r, f.side, f.at, 0.24);
      wallBoard(c, f.side, f.at - f.w / 2 - 0.3, f.at + f.w / 2 + 0.3, elev + 0.6, elev + 3.5, "wall", 0.23);
      b.surface({ id: `timeline-${c.room.id}`, kind: "timeline", group, p: [m.x, elev + 2.05, m.z], ry: m.ry, w: f.w, h: f.w * 0.22 });
      roomAnchor(c, wallHit(c, f.side, f.at, f.w + 0.2, elev + 2.05, 2.8, 0.8), wallApproach(c, f.side, f.at, 2.25), "company-story", "story");
      return;
    }
    case "kiosk": {
      const [x, z] = f.at;
      b.prop("kioskBase", group, [x, fy, z], -HALF_PI);
      b.surface({ id: `kiosk-${c.room.id}`, kind: "kiosk", group, p: [x - 0.015, elev + 1.42, z], ry: -HALF_PI, w: 0.86, h: 1.25, emissive: true });
      b.circleCollider(level, x, z, 0.6);
      roomAnchor(c, { p: [x, elev + 1.1, z], s: [1.2, 2.2, 1.2] }, [x - 1.5, z], "services", "kiosk");
      return;
    }
    case "cafeCounter": {
      const [x, z] = f.at;
      b.special({ id: `cafe-counter-${c.room.id}`, kind: "counter", group, p: [x, fy, z], ry: 0, size: [f.width, 1.05, 0.8] });
      b.boxMinMax(group, x - f.width / 2 - 0.4, fy, r.z0, x + f.width / 2 + 0.4, elev + 2.2, r.z0 + 0.4, "woodMid");
      b.rectCollider(level, x - f.width / 2 - 0.2, r.z0, x + f.width / 2 + 0.2, z + 0.5);
      return;
    }
    case "stools": {
      const spacing = f.spacing ?? 1.6;
      for (let i = 0; i < f.count; i++) {
        const x = f.at[0] + i * spacing;
        b.prop("stool", group, [x, fy, f.at[1]], 0);
        b.circleCollider(level, x, f.at[1], 0.25);
      }
      return;
    }
    case "directoryBoard": {
      const y = elev + 1.65;
      wallBoard(c, f.side, f.at - 1.15, f.at + 1.15, y - 0.85, y + 0.85, "frame", 0.24);
      const m = mount(r, f.side, f.at, 0.25);
      b.surface({ id: `directory-${c.room.id}-${f.at}`, kind: "directory", group, p: [m.x, y, m.z], ry: m.ry, w: 2.1, h: 1.55, emissive: true });
      roomAnchor(c, wallHit(c, f.side, f.at, 2.4, y, 1.9), wallApproach(c, f.side, f.at, 1.6), "directory-board", "directory");
      return;
    }
  }
}

/* ------------------------------------------------------------------------------------------------
 * Partitions (interior walls with doors)
 * ---------------------------------------------------------------------------------------------- */
function buildPartition(b: WorldBuilder, p: PartitionConfig, ctx: OfficeContext) {
  const group = ctx.groupOf(p.buildingId, p.level);
  const level = p.level;
  const elev = b.data.levels[level].elevation;
  const h = ctx.storeyHeight(p.buildingId, level);
  const y0 = elev;
  const y1 = elev + h;
  const openings = (p.doors ?? []).map((d) => [d.center - d.width / 2, d.center + d.width / 2] as [number, number]);
  const base = { group, axis: p.axis, at: p.at, from: p.from, to: p.to, openings };
  const doorTop = y0 + 2.3;
  const sill = y0 + 1.0;
  switch (p.style) {
    case "glass":
      b.wall({ ...base, level, y0, y1, thickness: 0.08, m: "glass", colliderThickness: 0.3 });
      b.wall({ ...base, y0, y1: y0 + 0.1, thickness: 0.1, m: "frame", collide: false });
      b.mullions(group, p.axis, p.at, p.from, p.to, y0, y1, 1.8, "frame", 0.07, 0.11, openings);
      break;
    case "frosted":
    case "wood": {
      const lower: MaterialKey = p.style === "wood" ? "woodMid" : "wall";
      b.wall({ ...base, level, y0, y1: sill, thickness: 0.14, m: lower, colliderThickness: 0.3 });
      b.wall({ ...base, y0: sill, y1, thickness: 0.06, m: "glassFrost", collide: false });
      b.wall({ ...base, y0: sill - 0.02, y1: sill + 0.04, thickness: 0.18, m: p.style === "wood" ? "woodDark" : "frameLight", collide: false });
      b.mullions(group, p.axis, p.at, p.from, p.to, sill, y1, 1.5, p.style === "wood" ? "woodDark" : "frame", 0.07, 0.1, openings);
      break;
    }
    case "solid":
      b.wall({ ...base, level, y0, y1, thickness: 0.15, m: "wall" });
      break;
  }
  // Door frames, transoms and open door leaves.
  for (const [a, c] of openings) {
    const posts: Array<[number, number]> = [
      [a - 0.04, a + 0.04],
      [c - 0.04, c + 0.04],
    ];
    const infill: MaterialKey = p.style === "glass" ? "glass" : p.style === "solid" ? "wall" : "glassFrost";
    const leaf: MaterialKey = p.style === "wood" ? "woodMid" : p.style === "glass" ? "glass" : "white";
    if (p.axis === "x") {
      for (const [u, v] of posts) b.boxMinMax(group, u, y0, p.at - 0.08, v, doorTop, p.at + 0.08, "frame");
      b.boxMinMax(group, a, doorTop - 0.04, p.at - 0.08, c, doorTop + 0.06, p.at + 0.08, "frame");
      b.boxMinMax(group, a, doorTop + 0.06, p.at - 0.03, c, y1, p.at + 0.03, infill);
      b.boxMinMax(group, a + 0.02, y0 + 0.02, p.at - 0.05 - (c - a) * 0.86, a + 0.06, doorTop - 0.06, p.at - 0.05, leaf);
    } else {
      for (const [u, v] of posts) b.boxMinMax(group, p.at - 0.08, y0, u, p.at + 0.08, doorTop, v, "frame");
      b.boxMinMax(group, p.at - 0.08, doorTop - 0.04, a, p.at + 0.08, doorTop + 0.06, c, "frame");
      b.boxMinMax(group, p.at - 0.03, doorTop + 0.06, a, p.at + 0.03, y1, c, infill);
      b.boxMinMax(group, p.at + 0.05, y0 + 0.02, a + 0.02, p.at + 0.05 + (c - a) * 0.86, doorTop - 0.06, a + 0.06, leaf);
    }
  }
}

/* ------------------------------------------------------------------------------------------------
 * Entry point
 * ---------------------------------------------------------------------------------------------- */
const PLAQUE_KINDS = new Set(["team-cabin", "ceo-cabin", "meeting", "workspace"]);

export function buildOffice(b: WorldBuilder, ctx: OfficeContext) {
  anchorCounter = 0;
  const deptById = new Map(ctx.departments.map((d) => [d.id, d]));
  const roomDefs = new Map<string, RoomDef>();

  for (const p of ctx.layout.partitions) buildPartition(b, p, ctx);

  for (const room of ctx.layout.rooms) {
    const level = room.level;
    const elev = b.data.levels[level].elevation;
    const group = ctx.groupOf(room.buildingId, level);
    const r = rect(...room.rect);
    const floorOffset = level === "ground" ? 0.03 : 0.012;
    if (room.floor) b.floor({ id: `floor-${room.id}`, level, group, rect: r, y: elev + floorOffset, material: room.floor, walkable: true });
    const dept = room.departmentId ? deptById.get(room.departmentId) : undefined;
    const c: RoomCtx = {
      b,
      room,
      r,
      level,
      group,
      elev,
      fy: elev + (level === "ground" ? 0.03 : 0),
      floorY: elev + floorOffset,
      height: ctx.storeyHeight(room.buildingId, level),
      accent: room.accent ?? dept?.color ?? "#2f6bff",
      seats: [],
      dept,
      ctx,
    };
    for (const f of room.fixtures ?? []) buildFixture(c, f);
    b.data.seats.push(...c.seats);
    b.data.zones.push({ id: `zone-${room.id}`, label: room.name, level, rect: r });
    const def: RoomDef = {
      id: room.id,
      buildingId: room.buildingId,
      level,
      group,
      rect: r,
      y: elev + floorOffset,
      entry: room.entry,
      doors: [],
      label: [(r.x0 + r.x1) / 2, elev + 2.9, (r.z0 + r.z1) / 2],
    };
    roomDefs.set(room.id, def);
    b.data.rooms.push(def);
  }

  const roomAt = (level: LevelId, x: number, z: number) =>
    ctx.layout.rooms.find((rm) => rm.level === level && rectContains(rect(...rm.rect), x, z));

  // Doorways: attach to the rooms on both sides, add name plaques outside cabins.
  let plaque = 0;
  for (const p of ctx.layout.partitions) {
    const group = ctx.groupOf(p.buildingId, p.level);
    const elev = b.data.levels[p.level].elevation;
    for (const d of p.doors ?? []) {
      const [x, z] = p.axis === "x" ? [d.center, p.at] : [p.at, d.center];
      const [nx, nz] = p.axis === "x" ? [0, 1] : [1, 0];
      const sides = [1, -1].map((s) => ({ s, room: roomAt(p.level, x + nx * s * 0.6, z + nz * s * 0.6) }));
      for (const { s, room } of sides) {
        if (!room) continue;
        roomDefs.get(room.id)?.doors.push({ x, z, axis: p.axis, width: d.width });
        if (!PLAQUE_KINDS.has(room.kind)) continue;
        // Plaque on the outside face (opposite side), beside the door.
        const out = -s;
        const along = d.center + d.width / 2 + 0.75;
        const px = p.axis === "x" ? along : p.at + out * 0.1;
        const pz = p.axis === "x" ? p.at + out * 0.1 : along;
        const ry = p.axis === "x" ? (out > 0 ? 0 : PI) : out > 0 ? HALF_PI : -HALF_PI;
        b.surface({ id: `plaque-${room.id}-${plaque++}`, kind: "sign", group, p: [px, elev + 1.65, pz], ry, w: 1.5, h: 0.24, text: room.name, variant: 1 });
        const apx = p.axis === "x" ? along : p.at + out * 1.4;
        const apz = p.axis === "x" ? p.at + out * 1.4 : along;
        b.anchor({
          id: `anchor-plaque-${room.id.replace(/^room-/, "")}-${plaque}`,
          contentId: room.id,
          level: p.level,
          group,
          p: [px, elev + 1.65, pz],
          s: p.axis === "x" ? [1.6, 0.6, 0.4] : [0.4, 0.6, 1.6],
          approach: [apx, apz],
        });
      }
    }
  }
  for (const d of ctx.exteriorDoors) {
    const inside = d.axis === "x" ? roomAt(d.level, d.x, d.z - 0.6) : roomAt(d.level, d.x - 0.6, d.z);
    if (inside) roomDefs.get(inside.id)?.doors.push({ x: d.x, z: d.z, axis: d.axis, width: d.width });
  }
  // Rooms with no doorway (whole floors, open plan) are entered from the stairs or lift.
  for (const def of roomDefs.values()) {
    if (def.doors.length) continue;
    for (const link of b.data.links) {
      const stop = link.stops.find((s) => s.level === def.level && rectContains(def.rect, s.x, s.z));
      if (stop) def.doors.push({ x: stop.x, z: stop.z, axis: "x", width: link.kind === "stairs" ? 1.8 : 1.6 });
    }
  }

  // People at their seats.
  for (const person of ctx.people) {
    const seat = b.data.seats.find((s) => s.roomId === person.location.roomId && s.index === person.location.seat);
    if (!seat) {
      b.data.problems.push(`person "${person.id}" has no seat ${person.location.roomId}#${person.location.seat}`);
      continue;
    }
    if (seat.personId) {
      b.data.problems.push(`seat ${seat.id} is assigned to both "${seat.personId}" and "${person.id}"`);
      continue;
    }
    seat.personId = person.id;
    const look = lookFor(person);
    const pose = person.pose ?? (seat.kind === "host" ? "stand" : "sit");
    const [x, y, z, ry] = pose === "stand" ? seat.stand : seat.sit;
    if (pose === "stand" && person.animated) {
      b.featured({ id: person.id, anchorId: `anchor-${person.id}`, group: seat.group, p: [x, y, z], ry, pose: "stand", look });
    } else {
      b.npc(pose, seat.group, [x, y, z], ry, look);
    }
    if (pose === "stand") {
      b.circleCollider(seat.level, x, z, 0.32);
      b.anchor({ id: `anchor-${person.id}`, contentId: person.id, level: seat.level, group: seat.group, p: [x, y + 0.95, z], s: [0.9, 1.9, 0.9], approach: seat.approach });
    }
  }
  for (const seat of b.data.seats) {
    // Every desk is clickable: the occupant's profile, or the team room for a free desk.
    if (seat.kind === "host" && !seat.personId) continue;
    if (seat.kind === "host" && seat.personId && b.data.anchors.some((a) => a.id === `anchor-${seat.personId}`) && seat.hit.s[1] > 1.5) continue;
    b.anchor({
      id: `anchor-seat-${seat.roomId.replace(/^room-/, "")}-${seat.index}`,
      contentId: seat.personId ?? seat.roomId,
      level: seat.level,
      group: seat.group,
      p: seat.hit.p,
      s: seat.hit.s,
      approach: seat.approach,
    });
  }
  for (const room of ctx.layout.rooms) {
    if (!roomDefs.has(room.id)) continue;
    if (!b.data.levels[room.level]) b.data.problems.push(`room "${room.id}" is on unknown level "${room.level}"`);
  }
}
