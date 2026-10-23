import { companySignText } from "@/data/company";
import { officeLayout } from "@/data/office-layout";
import { departments, people, projects } from "@/data/organization";
import type { BuildingId, LevelId, VisibilityGroup } from "@/types/experience";
import { WorldBuilder, insetRect, rect, rectContains } from "./builder";
import {
  AVENUE,
  ELEVATOR_STOP,
  FOUNTAIN,
  GARDEN,
  HQ,
  HQ_L1_Y,
  HQ_ROOF_Y,
  LAND,
  MKT,
  MKT_STAIRS,
  MKT_STAIR_STOP,
  PARKING,
  PAVILION_UPPER_Y,
  PIER,
  PLAZA,
  POOL_DECK,
  POOL_WATER,
  QUAY,
  SALES,
  SALES_STAIRS,
  SALES_STAIR_STOP,
} from "./constants";
import { buildOffice } from "./office";
import type { CutDef, FloorMaterial, Rect, WorldData } from "./types";

const PI = Math.PI;
const HALF_PI = Math.PI / 2;

/** Paved paths (also drawn on the mini-map). */
const PATHS: Rect[] = [
  rect(-19, -21, 19, -17), // HQ ring north
  rect(-19, -17, -15, 5), // HQ ring west
  rect(15, -17, 19, 5), // HQ ring east
  rect(-19, 5, 19, 9), // HQ forecourt
  rect(-48, 11, -12, 15), // west promenade
  rect(-44, 6, -40, 11), // marketing entrance
  rect(20, 11, 48, 15), // east promenade
  rect(40, 4, 44, 11), // sales entrance
  rect(-17, -25, -13, -21), // to pool
  rect(19, -21, 30, -17), // to garden
  rect(26, -24, 30, -21),
  rect(-30, 15, -26, 40), // south-west walk to the quay
  rect(36, 15, 40, 24), // to parking
  rect(-58, -29, -54, 11), // west loop
  rect(-58, -29, -40, -25),
  rect(-54, 11, -48, 15),
];

let floorCounter = 0;
function addFloor(
  b: WorldBuilder,
  level: LevelId,
  group: VisibilityGroup,
  r: Rect,
  y: number,
  material: FloorMaterial,
  walkable = true,
) {
  b.floor({ id: `floor-${floorCounter++}`, level, group, rect: r, y, material, walkable });
}

function standingNpc(b: WorldBuilder, level: LevelId, group: VisibilityGroup, x: number, y: number, z: number, ry: number) {
  b.npc("stand", group, [x, y, z], ry);
  b.circleCollider(level, x, z, 0.32);
}

/* ------------------------------------------------------------------------------------------------
 * Levels
 * ---------------------------------------------------------------------------------------------- */
function defineLevels(b: WorldBuilder) {
  b.level({
    id: "ground",
    label: "Campus & ground floors",
    elevation: 0,
    group: "exterior",
    walkable: [rect(LAND.x0 + 0.6, LAND.z0 + 0.6, LAND.x1 - 0.6, 43.4), rect(PIER.x0 + 0.5, 43.0, PIER.x1 - 0.5, PIER.z1 - 0.5)],
  });
  b.level({ id: "hq-1", label: "HQ Level 1", buildingId: "hq", elevation: HQ_L1_Y, group: "hq-1", walkable: [insetRect(HQ, 0.15)] });
  b.level({ id: "hq-roof", label: "HQ Rooftop", buildingId: "hq", elevation: HQ_ROOF_Y, group: "hq-roof", walkable: [insetRect(HQ, 0.45)] });
  b.level({ id: "mkt-1", label: "Marketing upper floor", buildingId: "marketing", elevation: PAVILION_UPPER_Y, group: "mkt-1", walkable: [insetRect(MKT, 0.15)] });
  b.level({ id: "sales-1", label: "Sales upper floor", buildingId: "sales", elevation: PAVILION_UPPER_Y, group: "sales-1", walkable: [insetRect(SALES, 0.15)] });

  b.data.links.push(
    {
      id: "hq-elevator",
      buildingId: "hq",
      kind: "elevator",
      stops: [
        { level: "ground", ...ELEVATOR_STOP },
        { level: "hq-1", ...ELEVATOR_STOP },
        { level: "hq-roof", ...ELEVATOR_STOP },
      ],
    },
    {
      id: "mkt-stairs",
      buildingId: "marketing",
      kind: "stairs",
      stops: [
        { level: "ground", ...MKT_STAIR_STOP },
        { level: "mkt-1", ...MKT_STAIR_STOP },
      ],
    },
    {
      id: "sales-stairs",
      buildingId: "sales",
      kind: "stairs",
      stops: [
        { level: "ground", ...SALES_STAIR_STOP },
        { level: "sales-1", ...SALES_STAIR_STOP },
      ],
    },
  );
}

/* ------------------------------------------------------------------------------------------------
 * Grounds: lawns, paths, plaza, avenue, quay, pier
 * ---------------------------------------------------------------------------------------------- */
function buildGrounds(b: WorldBuilder) {
  addFloor(b, "ground", "exterior", LAND, 0, "grass");
  for (const p of PATHS) addFloor(b, "ground", "exterior", p, 0.012, "paving");
  b.data.mapPaths.push(...PATHS, AVENUE, QUAY);
  addFloor(b, "ground", "exterior", PLAZA, 0.016, "plaza");
  addFloor(b, "ground", "exterior", AVENUE, 0.014, "paving");
  addFloor(b, "ground", "exterior", QUAY, 0.013, "paving");
  addFloor(b, "ground", "exterior", PIER, 0.05, "deck");
  b.special({ id: "pier", kind: "pier", group: "exterior", p: [(PIER.x0 + PIER.x1) / 2, 0, (PIER.z0 + PIER.z1) / 2], ry: 0, size: [PIER.x1 - PIER.x0, 0, PIER.z1 - PIER.z0] });

  // Fountain plaza.
  b.special({ id: "fountain", kind: "fountain", group: "exterior", p: [FOUNTAIN.x, 0, FOUNTAIN.z], ry: 0, size: [FOUNTAIN.r, 0, 0] });
  b.circleCollider("ground", FOUNTAIN.x, FOUNTAIN.z, FOUNTAIN.r + 0.3);
  b.anchor({ id: "anchor-fountain", contentId: "fountain", level: "ground", group: "exterior", p: [FOUNTAIN.x, 1.4, FOUNTAIN.z], s: [FOUNTAIN.r * 1.45, 2.8, FOUNTAIN.r * 1.45], approach: [FOUNTAIN.x, FOUNTAIN.z - FOUNTAIN.r - 1.4] });
  for (const a of [PI / 4, (3 * PI) / 4, (5 * PI) / 4, (7 * PI) / 4]) {
    const x = FOUNTAIN.x + Math.cos(a) * 7.6;
    const z = FOUNTAIN.z + Math.sin(a) * 7.6;
    b.prop("bench", "exterior", [x, 0, z], Math.atan2(-Math.cos(a), -Math.sin(a)));
    b.circleCollider("ground", x, z, 0.95);
  }
  b.npc("sit", "exterior", [FOUNTAIN.x + Math.cos(PI / 4) * 7.45, 0.02, FOUNTAIN.z + Math.sin(PI / 4) * 7.45], Math.atan2(-Math.cos(PI / 4), -Math.sin(PI / 4)));
  b.npc("sit", "exterior", [FOUNTAIN.x + Math.cos((5 * PI) / 4) * 7.45, 0.02, FOUNTAIN.z + Math.sin((5 * PI) / 4) * 7.45], Math.atan2(-Math.cos((5 * PI) / 4), -Math.sin((5 * PI) / 4)));
  standingNpc(b, "ground", "exterior", 12.2, 0, 13.1, -2.4);
  standingNpc(b, "ground", "exterior", 11.4, 0, 12.3, 0.7);

  for (const [x, z] of [
    [-9.5, 11.5],
    [17.5, 11.5],
    [-9.5, 23.5],
    [17.5, 23.5],
  ] as const) {
    b.boxMinMax("exterior", x - 1.3, 0, z - 1.3, x + 1.3, 0.55, z + 1.3, "concrete");
    b.prop("treeRound", "exterior", [x, 0.55, z], b.rng() * PI, { scale: 0.95 });
    b.circleCollider("ground", x, z, 1.6);
  }
  for (const [x, z] of [
    [-11.3, 17.5],
    [19.3, 17.5],
    [4, 25.3],
    [-11.3, 9.8],
    [19.3, 9.8],
  ] as const) {
    b.prop("streetLamp", "exterior", [x, 0, z], 0);
    b.circleCollider("ground", x, z, 0.22);
  }

  // Avenue to the waterfront and the entrance gate.
  for (const z of [28, 32.4, 36.2]) {
    for (const x of [-0.7, 8.7]) {
      b.prop("tree", "exterior", [x, 0, z], b.rng() * PI, { scale: 1.05 });
      b.circleCollider("ground", x, z, 0.55);
    }
  }
  for (const z of [30.2, 34.4]) {
    for (const x of [1.4, 6.6]) {
      b.prop("streetLamp", "exterior", [x, 0, z], x < 4 ? HALF_PI : -HALF_PI);
      b.circleCollider("ground", x, z, 0.22);
    }
  }
  b.special({ id: "gate", kind: "gate", group: "exterior", p: [4, 0, 39], ry: 0, size: [8.6, 4.8, 0.8] });
  b.circleCollider("ground", -0.3, 39, 0.6);
  b.circleCollider("ground", 8.3, 39, 0.6);
  b.surface({ id: "gate-sign", kind: "sign", group: "exterior", p: [4, 4.15, 39.42], ry: 0, w: 5.6, h: 0.62, text: "WELCOME", variant: 1 });

  // Quay railing, benches and lamps.
  for (let x = LAND.x0 + 1; x <= LAND.x1 - 1; x += 2.5) {
    if (x > PIER.x0 - 0.5 && x < PIER.x1 + 0.5) continue;
    b.prop("railPost", "exterior", [x, 0, 43.75], 0);
  }
  b.boxMinMax("exterior", LAND.x0 + 1, 0.98, 43.7, PIER.x0 - 0.4, 1.04, 43.8, "metal");
  b.boxMinMax("exterior", PIER.x1 + 0.4, 0.98, 43.7, LAND.x1 - 1, 1.04, 43.8, "metal");
  for (const x of [-52, -18, 16, 30, 52]) {
    b.prop("bench", "exterior", [x, 0, 41.6], 0);
    b.rectCollider("ground", x - 1, 41.2, x + 1, 42.05);
  }
  b.npc("sit", "exterior", [16.3, 0.02, 41.5], 0);
  b.npc("sit", "exterior", [-18.4, 0.02, 41.5], 0);
  for (let x = -58; x <= 58; x += 13) {
    if (x > AVENUE.x0 - 1 && x < AVENUE.x1 + 1) continue;
    b.prop("streetLamp", "exterior", [x, 0, 40.6], 0);
    b.circleCollider("ground", x, 40.6, 0.22);
  }
  // Pier railings.
  for (let z = PIER.z0 + 1; z <= PIER.z1 - 0.3; z += 2.2) {
    b.prop("railPost", "exterior", [PIER.x0 + 0.2, 0.05, z], 0);
    b.prop("railPost", "exterior", [PIER.x1 - 0.2, 0.05, z], 0);
  }
  b.boxMinMax("exterior", PIER.x0 + 0.15, 1.02, PIER.z0 + 1, PIER.x0 + 0.25, 1.08, PIER.z1 - 0.3, "metal");
  b.boxMinMax("exterior", PIER.x1 - 0.25, 1.02, PIER.z0 + 1, PIER.x1 - 0.15, 1.08, PIER.z1 - 0.3, "metal");
  b.special({ id: "sailboat", kind: "sailboat", group: "exterior", p: [34, 0, 60], ry: -0.5 });

  // South-west garden benches and flower beds.
  for (const z of [20, 27, 34]) {
    b.prop("bench", "exterior", [-31.4, 0, z], HALF_PI);
    b.rectCollider("ground", -31.85, z - 1, -31.0, z + 1);
    b.prop("streetLamp", "exterior", [-25.4, 0, z + 3], 0);
    b.circleCollider("ground", -25.4, z + 3, 0.22);
  }
  for (const [x, z, w, d] of [
    [-44, 21, 7, 3],
    [-44, 31, 7, 3],
    [-16, 21, 5, 3],
    [-16, 31, 5, 3],
  ] as const) {
    b.boxMinMax("exterior", x - w / 2, 0, z - d / 2, x + w / 2, 0.45, z + d / 2, "concrete");
    for (let i = 0; i < 4; i++) {
      b.prop("bush", "exterior", [x - w / 2 + 0.9 + (i * (w - 1.8)) / 3, 0.45, z], b.rng() * PI, { scale: 0.7, color: i % 2 ? "#5aa845" : "#d77fa1" });
    }
    b.rectCollider("ground", x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  }
}

/* ------------------------------------------------------------------------------------------------
 * HQ — three storeys: ground (reception, projects gallery, story), Level 1 (workspace,
 * meeting room, executive office) and the rooftop lounge.
 * ---------------------------------------------------------------------------------------------- */
function hqFacade(b: WorldBuilder, group: VisibilityGroup, level: LevelId, y0: number, y1: number, southOpenings: Array<[number, number]> = []) {
  const glass = { group, level, y0, y1, thickness: 0.08, m: "glass" as const, colliderThickness: 0.3 };
  b.wall({ ...glass, axis: "x", at: HQ.z1, from: HQ.x0, to: HQ.x1, openings: southOpenings });
  b.wall({ ...glass, axis: "x", at: HQ.z0, from: HQ.x0, to: HQ.x1 });
  b.wall({ ...glass, axis: "z", at: HQ.x0, from: HQ.z0, to: HQ.z1 });
  b.wall({ ...glass, axis: "z", at: HQ.x1, from: HQ.z0, to: HQ.z1 });
  b.mullions(group, "x", HQ.z1, HQ.x0, HQ.x1, y0, y1, 2.5, "frame", 0.12, 0.18, southOpenings);
  b.mullions(group, "x", HQ.z0, HQ.x0, HQ.x1, y0, y1, 2.5, "frame", 0.12, 0.18);
  b.mullions(group, "z", HQ.x0, HQ.z0, HQ.z1, y0, y1, 2.5, "frame", 0.12, 0.18);
  b.mullions(group, "z", HQ.x1, HQ.z0, HQ.z1, y0, y1, 2.5, "frame", 0.12, 0.18);
  // Thin rails so a storey looks finished when the floors above are cut away.
  for (const yy of [y0 + 0.06, y1 - 0.06]) {
    b.boxMinMax(group, HQ.x0, yy - 0.06, HQ.z1 - 0.1, HQ.x1, yy + 0.06, HQ.z1 + 0.1, "frame");
    b.boxMinMax(group, HQ.x0, yy - 0.06, HQ.z0 - 0.1, HQ.x1, yy + 0.06, HQ.z0 + 0.1, "frame");
    b.boxMinMax(group, HQ.x0 - 0.1, yy - 0.06, HQ.z0, HQ.x0 + 0.1, yy + 0.06, HQ.z1, "frame");
    b.boxMinMax(group, HQ.x1 - 0.1, yy - 0.06, HQ.z0, HQ.x1 + 0.1, yy + 0.06, HQ.z1, "frame");
  }
  for (const [x, z] of [
    [HQ.x0, HQ.z0],
    [HQ.x1, HQ.z0],
    [HQ.x0, HQ.z1],
    [HQ.x1, HQ.z1],
  ] as const) {
    b.box(group, [x, (y0 + y1 + 0.3) / 2, z], [0.75, y1 - y0 + 0.3, 0.75], "frame");
  }
}

function hqCore(b: WorldBuilder, group: VisibilityGroup, level: LevelId, y: number, h: number, withStairs = true) {
  b.boxMinMax(group, -2.6, y, HQ.z0 + 0.15, 2.6, y + h, -12.4, "concrete");
  b.rectCollider(level, -2.7, HQ.z0, 2.7, -12.3);
  b.special({ id: `elevator-${level}`, kind: "elevatorDoor", group, p: [0, y, -12.36], ry: 0 });
  if (withStairs) {
    b.special({ id: `stairs-${level}`, kind: "stairs", group, p: [4.2, y, -14.7], ry: 0, size: [2.8, HQ_L1_Y, 4.6] });
    b.rectCollider(level, 2.8, HQ.z0, 5.6, -12.4);
  }
  b.anchor({
    id: `anchor-elevator-${level}`,
    contentId: "elevator",
    level,
    group,
    p: [0, y + 1.5, -12.2],
    s: [2.6, 3, 0.5],
    approach: [ELEVATOR_STOP.x, ELEVATOR_STOP.z],
  });
}

function buildHQ(b: WorldBuilder) {
  const g0: VisibilityGroup = "hq-0";
  const g1: VisibilityGroup = "hq-1";
  const gr: VisibilityGroup = "hq-roof";

  /* ---------- Ground floor shell (interiors come from src/data/office-layout.ts) ---------- */
  hqFacade(b, g0, "ground", 0, 3.9, [[-2.6, 2.6]]);
  b.boxMinMax(g0, -2.6, 3.0, HQ.z1 - 0.05, 2.6, 3.9, HQ.z1 + 0.05, "glass");
  b.boxMinMax(g0, -2.6, 2.94, HQ.z1 - 0.1, 2.6, 3.06, HQ.z1 + 0.1, "frame");
  b.special({ id: "hq-canopy", kind: "canopy", group: "hq-1", p: [0, 3.55, HQ.z1 + 1.7], ry: 0, size: [7.2, 0.25, 3.4] });
  b.circleCollider("ground", -3.3, HQ.z1 + 3.1, 0.18);
  b.circleCollider("ground", 3.3, HQ.z1 + 3.1, 0.18);
  hqCore(b, g0, "ground", 0, 3.9);

  /* ---------- Level 1 shell ---------- */
  const y1 = HQ_L1_Y;
  b.boxMinMax(g1, HQ.x0 - 0.15, y1 - 0.3, HQ.z0 - 0.15, HQ.x1 + 0.15, y1, HQ.z1 + 0.15, "white");
  hqFacade(b, g1, "hq-1", y1, HQ_ROOF_Y - 0.3);
  hqCore(b, g1, "hq-1", y1, 3.9);

  /* ---------- Rooftop ---------- */
  const yr = HQ_ROOF_Y;
  b.boxMinMax(gr, HQ.x0 - 0.15, yr - 0.3, HQ.z0 - 0.15, HQ.x1 + 0.15, yr, HQ.z1 + 0.15, "white");
  addFloor(b, "hq-roof", gr, insetRect(HQ, 0.3), yr + 0.01, "roofDeck");
  addFloor(b, "hq-roof", gr, rect(-4.5, -7.6, 14.7, 4.7), yr + 0.02, "deck");
  const CROWN = 1.9;
  const parapet = { group: gr, level: "hq-roof" as const, y0: yr, y1: yr + CROWN, thickness: 0.3, m: "frame" as const };
  b.wall({ ...parapet, axis: "x", at: HQ.z1, from: HQ.x0 - 0.15, to: HQ.x1 + 0.15 });
  b.wall({ ...parapet, axis: "x", at: HQ.z0, from: HQ.x0 - 0.15, to: HQ.x1 + 0.15 });
  b.wall({ ...parapet, axis: "z", at: HQ.x0, from: HQ.z0, to: HQ.z1 });
  b.wall({ ...parapet, axis: "z", at: HQ.x1, from: HQ.z0, to: HQ.z1 });
  b.boxMinMax(gr, HQ.x0 - 0.25, yr + CROWN, HQ.z1 - 0.2, HQ.x1 + 0.25, yr + CROWN + 0.14, HQ.z1 + 0.2, "white");
  b.boxMinMax(gr, HQ.x0 - 0.25, yr + CROWN, HQ.z0 - 0.2, HQ.x1 + 0.25, yr + CROWN + 0.14, HQ.z0 + 0.2, "white");
  b.boxMinMax(gr, HQ.x0 - 0.2, yr + CROWN, HQ.z0, HQ.x0 + 0.2, yr + CROWN + 0.14, HQ.z1, "white");
  b.boxMinMax(gr, HQ.x1 - 0.2, yr + CROWN, HQ.z0, HQ.x1 + 0.2, yr + CROWN + 0.14, HQ.z1, "white");
  b.surface({ id: "hq-sign-south", kind: "sign", group: gr, p: [5.2, yr + CROWN / 2, HQ.z1 + 0.17], ry: 0, w: 15, h: 1.5, text: companySignText(), variant: 0 });
  b.surface({ id: "hq-sign-west", kind: "sign", group: gr, p: [HQ.x0 - 0.17, yr + CROWN / 2, -6], ry: -HALF_PI, w: 12, h: 1.25, text: companySignText(), variant: 0 });
  b.anchor({ id: "anchor-hq-sign", contentId: "company", level: "ground", group: gr, p: [5.2, yr + CROWN / 2, HQ.z1 + 0.3], s: [15.4, 1.9, 0.6], approach: [4.6, 7.6] });

  b.boxMinMax(gr, -2.6, yr, HQ.z0 + 0.15, 2.6, yr + 2.9, -12.4, "frame");
  b.boxMinMax(gr, -2.8, yr + 2.9, HQ.z0, 2.8, yr + 3.05, -12.2, "white");
  b.boxMinMax(gr, 2.8, yr, HQ.z0 + 0.15, 5.6, yr + 2.5, -12.4, "wall");
  b.rectCollider("hq-roof", -2.7, HQ.z0, 5.7, -12.3);
  b.special({ id: "elevator-hq-roof", kind: "elevatorDoor", group: gr, p: [0, yr, -12.36], ry: 0 });
  b.anchor({ id: "anchor-elevator-hq-roof", contentId: "elevator", level: "hq-roof", group: gr, p: [0, yr + 1.5, -12.2], s: [2.6, 3, 0.5], approach: [ELEVATOR_STOP.x, ELEVATOR_STOP.z] });

  for (const [cx, cz, fabric] of [
    [2.0, -2.0, "#e8e4dc"],
    [9.8, 1.2, "#d6dde4"],
  ] as const) {
    b.loungeSet("hq-roof", gr, cx, cz, yr + 0.02, { ry: HALF_PI, fabric, people: 2, gap: 1.6 });
    b.prop("umbrella", gr, [cx, yr + 0.02, cz], 0);
  }
  b.anchor({ id: "anchor-rooftop-a", contentId: "room-rooftop", level: "hq-roof", group: gr, p: [2.0, yr + 1.3, -2.0], s: [4.4, 2.8, 2.8], approach: [2.0, 0.9] });
  b.anchor({ id: "anchor-rooftop-b", contentId: "room-rooftop", level: "hq-roof", group: gr, p: [9.8, yr + 1.3, 1.2], s: [4.4, 2.8, 2.8], approach: [6.4, 1.2] });
  for (const x of [-3.2, 0.6, 4.6, 8.4, 12.4]) {
    b.prop("planter", gr, [x, yr + 0.02, 4.0], 0);
    b.rectCollider("hq-roof", x - 0.75, 3.55, x + 0.75, 4.6);
  }
  for (const z of [-5.6, -2.2]) {
    b.prop("planter", gr, [14.0, yr + 0.02, z], HALF_PI);
    b.rectCollider("hq-roof", 13.5, z - 0.75, 14.6, z + 0.75);
  }
  for (const z of [-15.6, -13.7, -11.8, -9.9]) {
    for (const x of [-13.7, -12.2, -10.7, -9.2, -7.7, -6.2]) b.prop("solarPanel", gr, [x, yr, z], 0);
  }
  b.rectCollider("hq-roof", -14.6, -16.6, -5.4, -9.0);
  b.anchor({ id: "anchor-solar", contentId: "sustainability", level: "hq-roof", group: gr, p: [-10, yr + 0.5, -12.8], s: [9.2, 1, 7.8], approach: [-10, -8.2] });
  for (const [x, z] of [
    [-12.4, -6.5],
    [-8.0, -6.5],
    [-12.4, -2.2],
    [-8.0, -2.2],
    [-12.4, 2.1],
    [-8.0, 2.1],
  ] as const) {
    b.boxMinMax(gr, x - 1.6, yr, z - 0.8, x + 1.6, yr + 0.55, z + 0.8, "concrete");
    b.prop("bush", gr, [x - 0.8, yr + 0.55, z], b.rng() * PI, { scale: 0.65 });
    b.prop("bush", gr, [x + 0.8, yr + 0.55, z], b.rng() * PI, { scale: 0.6 });
    b.rectCollider("hq-roof", x - 1.6, z - 0.8, x + 1.6, z + 0.8);
  }
  b.special({ id: "skylight", kind: "skylight", group: gr, p: [10.2, yr, -12.8], ry: 0, size: [6, 1.4, 6.4] });
  b.rectCollider("hq-roof", 7.1, -16.1, 13.3, -9.5);
}

/* ------------------------------------------------------------------------------------------------
 * Two-storey pavilions (Marketing & Sales): glazed ground floor + roofless cut-away upper floor.
 * ---------------------------------------------------------------------------------------------- */
interface PavilionSpec {
  r: Rect;
  g0: VisibilityGroup;
  g1: VisibilityGroup;
  upper: LevelId;
  door: [number, number];
  stairs: Rect;
  signs: Array<{ face: "south" | "west"; at: number; text: string }>;
}

function buildPavilionShell(b: WorldBuilder, s: PavilionSpec) {
  const { r, g0, g1, upper } = s;
  const yu = PAVILION_UPPER_Y;
  // Ground floor storefront glazing.
  const glass = { group: g0, level: "ground" as const, y0: 0, y1: 2.9, thickness: 0.08, m: "glass" as const, colliderThickness: 0.3 };
  b.wall({ ...glass, axis: "x", at: r.z1, from: r.x0, to: r.x1, openings: [s.door] });
  b.wall({ ...glass, axis: "x", at: r.z0, from: r.x0, to: r.x1 });
  b.wall({ ...glass, axis: "z", at: r.x0, from: r.z0, to: r.z1 });
  b.wall({ ...glass, axis: "z", at: r.x1, from: r.z0, to: r.z1 });
  b.mullions(g0, "x", r.z1, r.x0, r.x1, 0, 2.9, 2, "frame", 0.1, 0.16, [s.door]);
  b.mullions(g0, "x", r.z0, r.x0, r.x1, 0, 2.9, 2, "frame", 0.1, 0.16);
  b.mullions(g0, "z", r.x0, r.z0, r.z1, 0, 2.9, 2, "frame", 0.1, 0.16);
  b.mullions(g0, "z", r.x1, r.z0, r.z1, 0, 2.9, 2, "frame", 0.1, 0.16);
  // Dark fascia band carrying the signage.
  b.boxMinMax(g0, r.x0 - 0.1, 2.9, r.z1 - 0.15, r.x1 + 0.1, 3.5, r.z1 + 0.15, "frame");
  b.boxMinMax(g0, r.x0 - 0.1, 2.9, r.z0 - 0.15, r.x1 + 0.1, 3.5, r.z0 + 0.15, "frame");
  b.boxMinMax(g0, r.x0 - 0.15, 2.9, r.z0, r.x0 + 0.15, 3.5, r.z1, "frame");
  b.boxMinMax(g0, r.x1 - 0.15, 2.9, r.z0, r.x1 + 0.15, 3.5, r.z1, "frame");
  b.boxMinMax(g0, s.door[0], 2.4, r.z1 - 0.06, s.door[1], 2.9, r.z1 + 0.06, "glass");
  for (const [x, z] of [
    [r.x0, r.z0],
    [r.x1, r.z0],
    [r.x0, r.z1],
    [r.x1, r.z1],
  ] as const) {
    b.box(g0, [x, 1.75, z], [0.55, 3.5, 0.55], "frame");
  }
  for (const sign of s.signs) {
    if (sign.face === "south") b.surface({ id: `sign-${sign.text}-${sign.face}`, kind: "sign", group: g0, p: [sign.at, 3.2, r.z1 + 0.17], ry: 0, w: 4.6, h: 0.52, text: sign.text, variant: 0 });
    else b.surface({ id: `sign-${sign.text}-${sign.face}`, kind: "sign", group: g0, p: [r.x0 - 0.17, 3.2, sign.at], ry: -HALF_PI, w: 4.0, h: 0.52, text: sign.text, variant: 0 });
  }

  // Upper floor: slab, floor, punched white walls that drop when facing the camera.
  b.boxMinMax(g1, r.x0 - 0.15, yu - 0.3, r.z0 - 0.15, r.x1 + 0.15, yu, r.z1 + 0.15, "white");
  const sides: Array<{ axis: "x" | "z"; at: number; from: number; to: number; n: [number, number] }> = [
    { axis: "x", at: r.z1, from: r.x0, to: r.x1, n: [0, 1] },
    { axis: "x", at: r.z0, from: r.x0, to: r.x1, n: [0, -1] },
    { axis: "z", at: r.x0, from: r.z0, to: r.z1, n: [-1, 0] },
    { axis: "z", at: r.x1, from: r.z0, to: r.z1, n: [1, 0] },
  ];
  for (const side of sides) {
    const cut: CutDef = { nx: side.n[0], nz: side.n[1], cutTop: yu + 1.0 };
    b.wall({ group: g1, level: upper, axis: side.axis, at: side.at, from: side.from, to: side.to, y0: yu, y1: yu + 1.0, thickness: 0.3, m: "wall" });
    b.wall({ group: g1, axis: side.axis, at: side.at, from: side.from, to: side.to, y0: yu + 1.0, y1: yu + 2.7, thickness: 0.06, m: "glass", cut });
    b.wall({ group: g1, axis: side.axis, at: side.at, from: side.from, to: side.to, y0: yu + 2.7, y1: yu + 3.3, thickness: 0.3, m: "wall", cut });
    b.mullions(g1, side.axis, side.at, side.from, side.to, yu + 1.0, yu + 2.7, 3.0, "wall", 0.45, 0.3, [], cut);
    b.box(g1, side.axis === "x" ? [(side.from + side.to) / 2, yu + 1.04, side.at] : [side.at, yu + 1.04, (side.from + side.to) / 2], side.axis === "x" ? [Math.abs(side.to - side.from) + 0.3, 0.08, 0.42] : [0.42, 0.08, Math.abs(side.to - side.from) + 0.3], "frameLight");
  }
  for (const [x, z] of [
    [r.x0, r.z0],
    [r.x1, r.z0],
    [r.x0, r.z1],
    [r.x1, r.z1],
  ] as const) {
    b.box(g1, [x, yu + 1.65, z], [0.5, 3.3, 0.5], "wall");
  }

  // Stairs between the floors.
  const st = s.stairs;
  const scx = (st.x0 + st.x1) / 2;
  const scz = (st.z0 + st.z1) / 2;
  b.special({ id: `stairs-${upper}`, kind: "stairs", group: g0, p: [scx, 0.03, scz], ry: 0, size: [st.x1 - st.x0, yu, st.z1 - st.z0] });
  b.rectCollider("ground", st.x0, st.z0, st.x1, st.z1);
  b.boxMinMax(g1, st.x0, yu, st.z0, st.x1, yu + 0.02, st.z1, "black");
  b.boxMinMax(g1, st.x0, yu, st.z1 - 0.05, st.x1, yu + 1.0, st.z1 + 0.05, "glass");
  b.boxMinMax(g1, st.x0 - 0.05, yu, st.z0, st.x0 + 0.05, yu + 1.0, st.z1, "glass");
  b.boxMinMax(g1, st.x0, yu + 0.98, st.z1 - 0.06, st.x1, yu + 1.04, st.z1 + 0.06, "metal");
  b.rectCollider(upper, st.x0 - 0.1, st.z0, st.x1, st.z1 + 0.1);
}

function buildMarketing(b: WorldBuilder) {
  const g0: VisibilityGroup = "mkt-0";
  const g1: VisibilityGroup = "mkt-1";
  const yu = PAVILION_UPPER_Y;
  buildPavilionShell(b, { r: MKT, g0, g1, upper: "mkt-1", door: [-44, -40], stairs: MKT_STAIRS, signs: [{ face: "south", at: -36, text: "Marketing" }] });
  b.anchor({ id: "anchor-marketing-sign", contentId: "room-marketing", level: "ground", group: g0, p: [-36, 3.2, MKT.z1 + 0.3], s: [4.8, 0.9, 0.5], approach: [-42, 8.4] });
  b.anchor({ id: "anchor-mkt-stairs", contentId: "stairs-marketing", level: "ground", group: g0, p: [(MKT_STAIRS.x0 + MKT_STAIRS.x1) / 2, 1.6, (MKT_STAIRS.z0 + MKT_STAIRS.z1) / 2], s: [3.4, 3.2, 4.2], approach: [MKT_STAIR_STOP.x, MKT_STAIR_STOP.z] });
  b.anchor({ id: "anchor-mkt-stairs-upper", contentId: "stairs-marketing", level: "mkt-1", group: g1, p: [(MKT_STAIRS.x0 + MKT_STAIRS.x1) / 2, yu + 0.6, (MKT_STAIRS.z0 + MKT_STAIRS.z1) / 2], s: [3.4, 1.2, 4.2], approach: [MKT_STAIR_STOP.x, MKT_STAIR_STOP.z] });
}

function buildSales(b: WorldBuilder) {
  const g0: VisibilityGroup = "sales-0";
  const g1: VisibilityGroup = "sales-1";
  const yu = PAVILION_UPPER_Y;
  buildPavilionShell(b, {
    r: SALES,
    g0,
    g1,
    upper: "sales-1",
    door: [40, 44],
    stairs: SALES_STAIRS,
    signs: [
      { face: "south", at: 36, text: "Sales" },
      { face: "west", at: -5, text: "Sales" },
    ],
  });
  b.anchor({ id: "anchor-sales-sign", contentId: "room-sales", level: "ground", group: g0, p: [36, 3.2, SALES.z1 + 0.3], s: [4.8, 0.9, 0.5], approach: [42, 6.6] });
  b.anchor({ id: "anchor-sales-stairs", contentId: "stairs-sales", level: "ground", group: g0, p: [(SALES_STAIRS.x0 + SALES_STAIRS.x1) / 2, 1.6, (SALES_STAIRS.z0 + SALES_STAIRS.z1) / 2], s: [3.4, 3.2, 4.2], approach: [SALES_STAIR_STOP.x, SALES_STAIR_STOP.z] });
  b.anchor({ id: "anchor-sales-stairs-upper", contentId: "stairs-sales", level: "sales-1", group: g1, p: [(SALES_STAIRS.x0 + SALES_STAIRS.x1) / 2, yu + 0.6, (SALES_STAIRS.z0 + SALES_STAIRS.z1) / 2], s: [3.4, 1.2, 4.2], approach: [SALES_STAIR_STOP.x, SALES_STAIR_STOP.z] });
}

/* ------------------------------------------------------------------------------------------------
 * Wellness pool, parking, team garden
 * ---------------------------------------------------------------------------------------------- */
function buildPool(b: WorldBuilder) {
  addFloor(b, "ground", "exterior", POOL_DECK, 0.015, "poolDeck");
  const cx = (POOL_WATER.x0 + POOL_WATER.x1) / 2;
  const cz = (POOL_WATER.z0 + POOL_WATER.z1) / 2;
  b.special({ id: "pool", kind: "pool", group: "exterior", p: [cx, 0, cz], ry: 0, size: [POOL_WATER.x1 - POOL_WATER.x0, 0, POOL_WATER.z1 - POOL_WATER.z0] });
  b.rectCollider("ground", POOL_WATER.x0 - 0.3, POOL_WATER.z0 - 0.3, POOL_WATER.x1 + 0.3, POOL_WATER.z1 + 0.3);
  b.anchor({ id: "anchor-pool", contentId: "wellness-pool", level: "ground", group: "exterior", p: [cx, 0.4, cz], s: [POOL_WATER.x1 - POOL_WATER.x0 + 0.6, 0.9, POOL_WATER.z1 - POOL_WATER.z0 + 0.6], approach: [POOL_WATER.x0 - 2.2, cz] });
  for (const x of [-32, -29, -26, -23, -20]) {
    b.prop("lounger", "exterior", [x, 0.015, -28.4], PI);
    b.rectCollider("ground", x - 0.45, -29.5, x + 0.45, -27.3);
  }
  b.npc("sit", "exterior", [-29, 0.25, -28.6], PI);
  b.npc("sit", "exterior", [-23, 0.25, -28.6], PI);
  for (const x of [-30.5, -24.5, -18.5]) {
    b.prop("umbrella", "exterior", [x, 0.015, -27.2], 0, { scale: 0.85 });
    b.circleCollider("ground", x, -27.2, 0.2);
  }
  for (let x = POOL_DECK.x0 + 1; x <= POOL_DECK.x1 - 1; x += 1.7) {
    b.prop("bush", "exterior", [x, 0, POOL_DECK.z0 + 0.6], b.rng() * PI, { scale: 0.85 });
  }
  b.rectCollider("ground", POOL_DECK.x0, POOL_DECK.z0, POOL_DECK.x1, POOL_DECK.z0 + 1.3);
  standingNpc(b, "ground", "exterior", -36.4, 0.015, -38.6, 1.2);
}

function buildParking(b: WorldBuilder) {
  addFloor(b, "ground", "exterior", PARKING, 0.012, "asphalt");
  b.data.mapPaths.push(PARKING);
  const colors = ["#e8ecef", "#1d2733", "#b23a3a", "#2f5f9e", "#c9ccd1", "#384b3a", "#d7b14a", "#f4f4f4", "#6c7480"];
  for (const [rowZ, ry] of [
    [27.4, 0],
    [34.6, PI],
  ] as const) {
    for (let i = 0; i < 11; i++) {
      const x = PARKING.x0 + 2.2 + i * 3.1;
      b.boxMinMax("exterior", x - 1.6, 0.013, rowZ - 2.3, x - 1.48, 0.03, rowZ + 2.3, "white");
      if (b.rng() < 0.72) {
        b.prop("car", "exterior", [x, 0, rowZ + (b.rng() - 0.5) * 0.3], ry + (b.rng() - 0.5) * 0.06, { color: b.pick(colors) });
        b.rectCollider("ground", x - 1.05, rowZ - 2.35, x + 1.05, rowZ + 2.35);
      }
    }
  }
  for (let z = PARKING.z0 + 0.8; z <= PARKING.z1 - 0.8; z += 1.6) {
    b.prop("bush", "exterior", [PARKING.x0 - 0.8, 0, z], b.rng() * PI, { scale: 0.9 });
  }
  b.rectCollider("ground", PARKING.x0 - 1.5, PARKING.z0, PARKING.x0 - 0.1, PARKING.z1);
  for (let x = PARKING.x0 + 0.8; x <= PARKING.x1 - 0.8; x += 1.6) {
    if ((x > 35 && x < 41) || (x > 19 && x < 23)) continue;
    b.prop("bush", "exterior", [x, 0, PARKING.z0 - 0.8], b.rng() * PI, { scale: 0.85 });
    b.circleCollider("ground", x, PARKING.z0 - 0.8, 0.7);
  }
  for (const x of [PARKING.x0 + 8, PARKING.x0 + 22, PARKING.x1 - 2]) {
    b.prop("streetLamp", "exterior", [x, 0, 31], 0);
    b.circleCollider("ground", x, 31, 0.22);
  }
}

function buildGarden(b: WorldBuilder) {
  for (const [x, z, ry] of [
    [30, -34, 0.2],
    [36.5, -29.5, -0.3],
    [42.5, -36, 0.5],
    [47.5, -29, 0],
  ] as const) {
    b.prop("picnicTable", "exterior", [x, 0, z], ry);
    b.circleCollider("ground", x, z, 1.35);
  }
  b.npc("sit", "exterior", [30.1, 0.02, -34.8], 0.2);
  b.npc("sit", "exterior", [36.3, 0.02, -28.7], PI - 0.3);
}

/* ------------------------------------------------------------------------------------------------
 * Trees: deterministic scatter in the lawns, avoiding paths and buildings.
 * ---------------------------------------------------------------------------------------------- */
function buildTrees(b: WorldBuilder) {
  const grow = (r: Rect, d: number) => insetRect(r, -d);
  const exclusions: Rect[] = [
    grow(HQ, 5),
    grow(MKT, 2.6),
    grow(SALES, 2.6),
    grow(PLAZA, 1),
    grow(AVENUE, 2.4),
    grow(PARKING, 1.6),
    grow(POOL_DECK, 1.2),
    rect(LAND.x0, 38.2, LAND.x1, LAND.z1),
    rect(24, -40, 52, -26),
    ...PATHS.map((p) => grow(p, 1.3)),
  ];
  const canopy = ["#4c9a3b", "#5aa845", "#3f8a36", "#6cb850", "#4a8f3e", "#79c25a"];
  const step = 4.6;
  for (let x = LAND.x0 + 2.2; x <= LAND.x1 - 2; x += step) {
    for (let z = LAND.z0 + 2.2; z <= 37.6; z += step) {
      const px = x + (b.rng() - 0.5) * 3.0;
      const pz = z + (b.rng() - 0.5) * 3.0;
      if (b.rng() > 0.82) continue;
      if (exclusions.some((r) => rectContains(r, px, pz))) continue;
      if (Math.hypot(px - FOUNTAIN.x, pz - FOUNTAIN.z) < 13) continue;
      const scale = 0.85 + b.rng() * 0.5;
      b.prop(b.rng() > 0.45 ? "tree" : "treeRound", "exterior", [px, 0, pz], b.rng() * PI * 2, { scale, color: b.pick(canopy) });
      b.circleCollider("ground", px, pz, 0.45 * scale);
    }
  }
  // Clipped hedges along the outer edges of the promenades.
  for (let x = -46; x <= -14; x += 2.1) {
    if (x > -31 && x < -25) continue;
    b.prop("bush", "exterior", [x, 0, 15.9], b.rng() * PI, { scale: 0.62, color: "#4b8d38" });
    b.circleCollider("ground", x, 15.9, 0.48);
  }
  for (let x = 21; x <= 47; x += 2.1) {
    if (x > 35 && x < 41) continue;
    b.prop("bush", "exterior", [x, 0, 15.9], b.rng() * PI, { scale: 0.62, color: "#4b8d38" });
    b.circleCollider("ground", x, 15.9, 0.48);
  }
  // A few bushes along the building edges for the miniature look.
  for (const r of [MKT, SALES]) {
    for (let x = r.x0 + 1; x < r.x1 - 1; x += 2.2) {
      if (x > (r === MKT ? -45 : 39) && x < (r === MKT ? -39 : 45)) continue;
      b.prop("bush", "exterior", [x, 0, r.z1 + 1.1], b.rng() * PI, { scale: 0.7 });
      b.circleCollider("ground", x, r.z1 + 1.1, 0.55);
    }
  }
}

/* ------------------------------------------------------------------------------------------------
 * Ambient walkers, location zones, cutaway buildings
 * ---------------------------------------------------------------------------------------------- */
function buildWalkers(b: WorldBuilder) {
  const ring: Array<[number, number]> = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    ring.push([FOUNTAIN.x + Math.cos(a) * 6.1, FOUNTAIN.z + Math.sin(a) * 6.1]);
  }
  b.data.walkers.push(
    { id: "walker-plaza", level: "ground", points: ring, speed: 1.15, look: b.randomLook() },
    { id: "walker-avenue", level: "ground", points: [[2.6, 27], [2.6, 38], [5.4, 38], [5.4, 27]], speed: 1.3, look: b.randomLook() },
    { id: "walker-west", level: "ground", points: [[-13.5, 13.7], [-47, 13.7], [-47, 12.3], [-13.5, 12.3]], speed: 1.4, look: b.randomLook() },
    { id: "walker-east", level: "ground", points: [[21, 12.4], [46.5, 12.4], [46.5, 13.8], [21, 13.8]], speed: 1.35, look: b.randomLook() },
    { id: "walker-quay", level: "ground", points: [[-56, 41.9], [56, 41.9], [56, 41.2], [-56, 41.2]], speed: 1.25, look: b.randomLook() },
    { id: "walker-ring", level: "ground", points: [[-17, 7.2], [-17, -19], [17, -19], [17, 7.2]], speed: 1.3, look: b.randomLook() },
  );
}

function defineZones(b: WorldBuilder) {
  // Building interiors get their zones from the office layout (one per room).
  b.data.zones.push(
    { id: "zone-plaza", label: "Central Plaza", level: "ground", rect: PLAZA },
    { id: "zone-entrance", label: "Main Entrance", level: "ground", rect: rect(-2, 26, 10, 40) },
    { id: "zone-pier", label: "Pier", level: "ground", rect: PIER },
    { id: "zone-quay", label: "Waterfront", level: "ground", rect: QUAY },
    { id: "zone-pool", label: "Wellness Pool", level: "ground", rect: POOL_DECK },
    { id: "zone-parking", label: "Parking", level: "ground", rect: PARKING },
    { id: "zone-garden", label: "Team Garden", level: "ground", rect: GARDEN },
  );
}

function defineBuildings(b: WorldBuilder) {
  b.data.buildings.push(
    { id: "hq", rect: HQ, height: 9.7, groups: ["hq-0", "hq-1", "hq-roof"], levels: ["ground", "hq-1", "hq-roof"] },
    { id: "marketing", rect: MKT, height: 7.1, groups: ["mkt-0", "mkt-1"], levels: ["ground", "mkt-1"] },
    { id: "sales", rect: SALES, height: 7.1, groups: ["sales-0", "sales-1"], levels: ["ground", "sales-1"] },
  );
}

const GROUPS: Record<BuildingId, Partial<Record<LevelId, VisibilityGroup>>> = {
  hq: { ground: "hq-0", "hq-1": "hq-1", "hq-roof": "hq-roof" },
  marketing: { ground: "mkt-0", "mkt-1": "mkt-1" },
  sales: { ground: "sales-0", "sales-1": "sales-1" },
};

function buildInteriors(b: WorldBuilder) {
  buildOffice(b, {
    layout: officeLayout,
    people,
    departments,
    caseStudies: projects.filter((p) => p.status === "case-study"),
    groupOf: (building, level) => GROUPS[building][level] ?? "exterior",
    storeyHeight: (building, level) => (building === "hq" ? (level === "hq-roof" ? 2.4 : 3.9) : level === "ground" ? 2.9 : 3.3),
    exteriorDoors: [
      { level: "ground", x: 0, z: HQ.z1, axis: "x", width: 5.2 },
      { level: "ground", x: -42, z: MKT.z1, axis: "x", width: 4 },
      { level: "ground", x: 42, z: SALES.z1, axis: "x", width: 4 },
    ],
  });
}

export function buildCampus(): WorldData {
  floorCounter = 0;
  const b = new WorldBuilder(LAND);
  defineLevels(b);
  buildGrounds(b);
  buildHQ(b);
  buildMarketing(b);
  buildSales(b);
  buildInteriors(b);
  buildPool(b);
  buildParking(b);
  buildGarden(b);
  buildTrees(b);
  buildWalkers(b);
  defineZones(b);
  defineBuildings(b);
  return b.data;
}

let cached: WorldData | null = null;
/** The campus is static and deterministic; build it once. */
export function getWorld(): WorldData {
  if (!cached) cached = buildCampus();
  return cached;
}
