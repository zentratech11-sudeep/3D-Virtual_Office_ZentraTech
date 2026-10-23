import { describe, expect, it } from "vitest";
import { movementConfig } from "@/config/office";
import { type CollisionLayer, hasLineOfSight, insideWalkable, moveWithCollision, overlapsAny } from "@/lib/collision";
import { Navigator, astar, buildNavGrid, pathLength } from "@/lib/navigation";
import { getWorld } from "@/world/campus";
import { HQ } from "@/world/constants";

const R = 0.35;
// A 20 x 20 room with a wall across the middle that has a 2 m door at x ∈ [8, 10].
const room: CollisionLayer = {
  walkable: [{ x0: 0, z0: 0, x1: 20, z1: 20 }],
  colliders: [
    { kind: "rect", x0: 0, z0: 9.85, x1: 8, z1: 10.15 },
    { kind: "rect", x0: 10, z0: 9.85, x1: 20, z1: 10.15 },
    { kind: "circle", x: 15, z: 15, r: 1 },
  ],
};

describe("character collision", () => {
  it("cannot walk through a wall, even with a large time step", () => {
    let [x, z] = [4, 12];
    for (let i = 0; i < 20; i++) [x, z] = moveWithCollision(room, x, z, 0, -1.2, R);
    expect(z).toBeGreaterThan(10.15 + R - 1e-3);
  });

  it("slides along walls instead of sticking", () => {
    const [x, z] = moveWithCollision(room, 4, 10.6, 1, -1, R);
    expect(x).toBeGreaterThan(4.5);
    expect(z).toBeGreaterThanOrEqual(10.15 + R - 1e-3);
  });

  it("passes through the door opening", () => {
    let [x, z] = [9, 14];
    for (let i = 0; i < 40; i++) [x, z] = moveWithCollision(room, x, z, 0, -0.25, R);
    expect(z).toBeLessThan(9);
  });

  it("stays inside the walkable bounds", () => {
    let [x, z] = [10, 2];
    for (let i = 0; i < 40; i++) [x, z] = moveWithCollision(room, x, z, -0.5, -0.5, R);
    expect(insideWalkable(room.walkable, x, z, R)).toBe(true);
    expect(x).toBeGreaterThanOrEqual(R - 1e-6);
    expect(z).toBeGreaterThanOrEqual(R - 1e-6);
  });

  it("is pushed out of round obstacles", () => {
    const [x, z] = moveWithCollision(room, 13.4, 15, 0.5, 0, R);
    expect(Math.hypot(x - 15, z - 15)).toBeGreaterThanOrEqual(1 + R - 1e-3);
  });

  it("computes line of sight through the door but not through the wall", () => {
    expect(hasLineOfSight(room, 9, 14, 9, 6, R)).toBe(true);
    expect(hasLineOfSight(room, 4, 14, 4, 6, R)).toBe(false);
  });
});

describe("grid pathfinding", () => {
  const grid = buildNavGrid("ground", room, R);

  it("finds a path through the door and avoids walls", () => {
    const path = astar(grid, [4, 15], [4, 5]);
    expect(path).not.toBeNull();
    for (const [x, z] of path!) expect(overlapsAny(room.colliders, x, z, R)).toBe(false);
    expect(path!.some(([x, z]) => x > 8 && x < 10 && Math.abs(z - 10) < 0.6)).toBe(true);
  });

  it("returns null when the goal is unreachable", () => {
    const sealed: CollisionLayer = { walkable: room.walkable, colliders: [{ kind: "rect", x0: 0, z0: 9.85, x1: 20, z1: 10.15 }] };
    const g = buildNavGrid("ground", sealed, R);
    expect(astar(g, [4, 15], [4, 5])).toBeNull();
  });
});

describe("campus navigation", () => {
  const nav = new Navigator(getWorld(), movementConfig.radius);

  it("routes from the entrance into the HQ through the front door", () => {
    const path = nav.pathOnLevel("ground", [4, 34.5], [0, -0.9]);
    expect(path).not.toBeNull();
    // The route must cross the south facade through the door opening (|x| < 2.6).
    for (let i = 1; i < path!.length; i++) {
      const [ax, az] = path![i - 1];
      const [bx, bz] = path![i];
      if ((az - HQ.z1) * (bz - HQ.z1) < 0) {
        const t = (HQ.z1 - az) / (bz - az);
        expect(Math.abs(ax + (bx - ax) * t)).toBeLessThan(2.6);
      }
    }
  });

  it("plans multi-level routes through the elevator", () => {
    const plan = nav.plan({ level: "ground", x: 4, z: 34.5 }, { level: "hq-roof", x: 5.6, z: 1.4 });
    expect(plan).not.toBeNull();
    expect(plan!.legs.map((l) => l.level)).toEqual(["ground", "hq-roof"]);
    expect(plan!.links).toEqual(["hq-elevator"]);
    expect(plan!.length).toBeGreaterThan(40);
  });

  it("routes between pavilions via ground level and stairs", () => {
    const plan = nav.plan({ level: "mkt-1", x: -42.4, z: -4.4 }, { level: "sales-1", x: 44, z: -2.4 });
    expect(plan!.legs.map((l) => l.level)).toEqual(["mkt-1", "ground", "sales-1"]);
    expect(plan!.links).toEqual(["mkt-stairs", "sales-stairs"]);
  });

  it("snaps clicks on furniture to the nearest free spot and rejects water", () => {
    const snapped = nav.snap("hq-1", -11.2, -8); // centre of a desk cluster
    expect(snapped).not.toBeNull();
    expect(overlapsAny(nav.layer("hq-1").colliders, snapped![0], snapped![1], movementConfig.radius)).toBe(false);
    expect(nav.snap("ground", 0, 80)).toBeNull();
  });

  it("produces smoothed paths much shorter than raw grid paths", () => {
    const path = nav.pathOnLevel("ground", [-40, 12], [40, 12])!;
    expect(path.length).toBeLessThan(12);
    expect(pathLength(path)).toBeLessThan(95);
  });
});
