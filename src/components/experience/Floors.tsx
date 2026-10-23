"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { LevelId, VisibilityGroup as Group } from "@/types/experience";
import { getWorld } from "@/world/campus";
import type { FloorDef, FloorMaterial } from "@/world/types";
import { FLOOR_TILE, getFloorMaterial } from "./materials";
import { VisibilityGroup } from "./VisibilityGroup";

interface FloorBatch {
  key: string;
  group: Group;
  level: LevelId;
  material: FloorMaterial;
  walkable: boolean;
  geometry: THREE.BufferGeometry;
}

/** Merges floor rectangles that share group/level/material into one mesh with world-space UVs. */
function buildBatches(floors: FloorDef[]): FloorBatch[] {
  const map = new Map<string, FloorDef[]>();
  for (const f of floors) {
    const key = `${f.group}|${f.level}|${f.material}|${f.walkable ? 1 : 0}`;
    const list = map.get(key) ?? [];
    list.push(f);
    map.set(key, list);
  }
  const out: FloorBatch[] = [];
  for (const [key, list] of map) {
    const pos: number[] = [];
    const uv: number[] = [];
    const tile = FLOOR_TILE[list[0].material];
    for (const f of list) {
      const { x0, z0, x1, z1 } = f.rect;
      const y = f.y;
      const quad = [
        [x0, z0],
        [x0, z1],
        [x1, z1],
        [x0, z0],
        [x1, z1],
        [x1, z0],
      ];
      for (const [x, z] of quad) {
        pos.push(x, y, z);
        uv.push(x / tile, -z / tile);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    out.push({ key, group: list[0].group, level: list[0].level, material: list[0].material, walkable: list[0].walkable, geometry: g });
  }
  return out;
}

/** Floors double as click-to-move surfaces (userData.floorLevel). */
export function Floors() {
  const batches = useMemo(() => buildBatches(getWorld().floors), []);
  const byGroup = useMemo(() => {
    const m = new Map<Group, FloorBatch[]>();
    for (const b of batches) m.set(b.group, [...(m.get(b.group) ?? []), b]);
    return [...m.entries()];
  }, [batches]);
  return (
    <>
      {byGroup.map(([group, list]) => (
        <VisibilityGroup key={group} group={group}>
          {list.map((b) => (
            <mesh
              key={b.key}
              geometry={b.geometry}
              material={getFloorMaterial(b.material)}
              receiveShadow
              userData={b.walkable ? { floorLevel: b.level } : { blocker: true }}
            />
          ))}
        </VisibilityGroup>
      ))}
    </>
  );
}
