"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { runtime } from "@/lib/runtime";
import { useExperience } from "@/lib/store";
import type { BuildingId } from "@/types/experience";
import { rectContains } from "@/world/builder";
import { getWorld } from "@/world/campus";

const ray = new THREE.Ray();
const box = new THREE.Box3();
const head = new THREE.Vector3();
const hit = new THREE.Vector3();

/**
 * Decides how many storeys of each building are shown (dollhouse cutaway):
 * - a floor chosen in the Floors menu wins;
 * - otherwise the character's own storey when inside the building;
 * - otherwise the ground floor only when the building hides the character from the camera.
 */
export function Cutaway() {
  const timer = useRef(0);
  useFrame(({ camera }, dt) => {
    timer.current += dt;
    if (timer.current < 0.1) return;
    timer.current = 0;
    const st = useExperience.getState();
    const p = runtime.player;
    const world = getWorld();
    const result = { ...st.cutLevels };
    head.set(p.x, p.y + 1.2, p.z);
    for (const b of world.buildings) {
      const top = b.levels.length - 1;
      let cut = top;
      if (st.floorView?.buildingId === b.id) {
        cut = Math.max(0, b.levels.indexOf(st.floorView.level));
      } else {
        const storey = b.levels.indexOf(p.level);
        const inside = rectContains(b.rect, p.x, p.z, 0.2) && (storey > 0 || p.level === "ground");
        if (inside && storey >= 0) cut = storey;
        else if (st.mode !== "intro" && st.mode !== "loading") {
          box.min.set(b.rect.x0, 0.2, b.rect.z0);
          box.max.set(b.rect.x1, b.height, b.rect.z1);
          ray.origin.copy(camera.position);
          ray.direction.copy(head).sub(camera.position);
          const len = ray.direction.length();
          ray.direction.normalize();
          if (ray.intersectBox(box, hit) && hit.distanceTo(camera.position) < len - 0.5) cut = 0;
        }
      }
      result[b.id as BuildingId] = cut;
    }
    st.setCutLevels(result);
  });
  return null;
}
