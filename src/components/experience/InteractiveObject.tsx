"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import { type ReactNode, useCallback, useMemo } from "react";
import * as THREE from "three";
import { selectContent } from "@/lib/actions";
import { useExperience } from "@/lib/store";
import { isInputLocked } from "@/lib/experience-machine";
import type { LevelId, VisibilityGroup as Group } from "@/types/experience";
import { getWorld } from "@/world/campus";
import type { AnchorDef } from "@/world/types";
import { VisibilityGroup } from "./VisibilityGroup";

const hitGeometry = new THREE.BoxGeometry(1, 1, 1);
const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });

/** Invisible, raycastable hit volumes for every interactive anchor. */
export function Hitboxes() {
  const byGroup = useMemo(() => {
    const m = new Map<Group, AnchorDef[]>();
    for (const a of getWorld().anchors) m.set(a.group, [...(m.get(a.group) ?? []), a]);
    return [...m.entries()];
  }, []);
  return (
    <>
      {byGroup.map(([group, anchors]) => (
        <VisibilityGroup key={group} group={group}>
          {anchors.map((a) => (
            <mesh
              key={a.id}
              geometry={hitGeometry}
              material={hitMaterial}
              position={a.p}
              scale={a.s}
              userData={{ anchorId: a.id, contentId: a.contentId, hitbox: true }}
            />
          ))}
        </VisibilityGroup>
      ))}
    </>
  );
}

type Pick = { kind: "anchor"; anchorId: string; contentId: string; point: THREE.Vector3 } | { kind: "floor"; level: LevelId; point: THREE.Vector3 } | null;

/** Visible = the object (unless it is a hit-box) and all of its ancestors are visible. */
function effectivelyVisible(obj: THREE.Object3D) {
  if (!obj.userData.hitbox && !obj.visible) return false;
  for (let o = obj.parent; o; o = o.parent) if (!o.visible) return false;
  return true;
}

/** Resolves raw hits to the first visible interactive anchor or walkable floor. */
export function resolvePick(intersections: THREE.Intersection[]): Pick {
  for (const hit of intersections) {
    const o = hit.object;
    if (!effectivelyVisible(o)) continue;
    if (o.userData.anchorId) return { kind: "anchor", anchorId: o.userData.anchorId, contentId: o.userData.contentId, point: hit.point };
    if (o.userData.floorLevel) return { kind: "floor", level: o.userData.floorLevel, point: hit.point };
    if (o.userData.blocker) return null;
  }
  return null;
}

/** Drag distance (px) above which a pointer-up is treated as a camera drag, not a click. */
const CLICK_TOLERANCE = 7;

/**
 * Centralised selection (TRD §7): one handler for every pickable surface. Hits on hidden
 * cutaway floors are ignored, child meshes resolve to registered anchor IDs.
 */
export function Pickables({ children }: { children: ReactNode }) {
  const gl = useThree((s) => s.gl);

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const st = useExperience.getState();
    if (isInputLocked(st)) return;
    if (e.delta > CLICK_TOLERANCE) return;
    const pick = resolvePick(e.intersections);
    if (!pick) return;
    if (pick.kind === "anchor") {
      selectContent(pick.contentId, { anchorId: pick.anchorId, focusCamera: true });
      return;
    }
    st.setFloorView(null);
    st.sendNav({ kind: "point", level: pick.level, x: pick.point.x, z: pick.point.z });
  }, []);

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const st = useExperience.getState();
      const pick = isInputLocked(st) ? null : resolvePick(e.intersections);
      const anchorId = pick?.kind === "anchor" ? pick.anchorId : null;
      st.setHoveredAnchor(anchorId);
      gl.domElement.style.cursor = anchorId ? "pointer" : "";
    },
    [gl],
  );

  const onPointerOut = useCallback(() => {
    useExperience.getState().setHoveredAnchor(null);
    gl.domElement.style.cursor = "";
  }, [gl]);

  return (
    <group onClick={onClick} onPointerMove={onPointerMove} onPointerOut={onPointerOut}>
      {children}
    </group>
  );
}
