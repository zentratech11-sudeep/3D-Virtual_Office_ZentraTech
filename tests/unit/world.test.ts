import { describe, expect, it } from "vitest";
import { destinations } from "@/config/destinations";
import { validateContentConfig } from "@/config/interactions";
import { movementConfig } from "@/config/office";
import { overlapsAny, insideWalkable } from "@/lib/collision";
import { Navigator } from "@/lib/navigation";
import { getWorld } from "@/world/campus";

const world = getWorld();
const nav = new Navigator(world, movementConfig.radius);
const spawn = movementConfig.spawn;

describe("campus world data", () => {
  it("builds deterministically", () => {
    expect(world.boxes.length).toBeGreaterThan(200);
    expect(world.props.length).toBeGreaterThan(200);
    expect(Object.keys(world.levels).sort()).toEqual(["ground", "hq-1", "hq-roof", "mkt-1", "sales-1"].sort());
  });

  it("has a valid content configuration with unique IDs and valid references", () => {
    expect(validateContentConfig()).toEqual([]);
  });

  it("has at least five distinct interactive content records placed in the scene", () => {
    const ids = new Set(world.anchors.map((a) => a.contentId));
    expect(ids.size).toBeGreaterThanOrEqual(5);
  });

  it("spawns the visitor on a free, walkable spot", () => {
    const layer = nav.layer("ground");
    expect(insideWalkable(layer.walkable, spawn.x, spawn.z, movementConfig.radius)).toBe(true);
    expect(overlapsAny(layer.colliders, spawn.x, spawn.z, movementConfig.radius)).toBe(false);
  });
});

describe("destinations", () => {
  for (const d of destinations) {
    it(`"${d.id}" is walkable and reachable from the entrance`, () => {
      const layer = nav.layer(d.level);
      const [x, z] = d.position;
      expect(insideWalkable(layer.walkable, x, z, movementConfig.radius), "inside walkable bounds").toBe(true);
      expect(overlapsAny(layer.colliders, x, z, movementConfig.radius), "not inside an obstacle").toBe(false);
      const plan = nav.plan({ level: spawn.level, x: spawn.x, z: spawn.z }, { level: d.level, x, z });
      expect(plan, "route exists").not.toBeNull();
      const last = plan!.legs.at(-1)!;
      expect(last.level).toBe(d.level);
      const end = last.points.at(-1)!;
      expect(Math.hypot(end[0] - x, end[1] - z)).toBeLessThan(0.6);
    });
  }
});

describe("interactive anchors", () => {
  for (const a of world.anchors) {
    it(`"${a.id}" can be approached`, () => {
      const snapped = nav.snap(a.level, a.approach[0], a.approach[1], 1.5);
      expect(snapped, `approach ${a.approach} snaps to a free cell`).not.toBeNull();
      const plan = nav.plan({ level: spawn.level, x: spawn.x, z: spawn.z }, { level: a.level, x: a.approach[0], z: a.approach[1] });
      expect(plan, "route exists").not.toBeNull();
    });
  }
});
