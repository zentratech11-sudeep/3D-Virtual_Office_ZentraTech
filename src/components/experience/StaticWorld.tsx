"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useExperience } from "@/lib/store";
import { getWorld } from "@/world/campus";
import type { BoxDef, MaterialKey, NpcDef, PropDef, PropType } from "@/world/types";
import { type CutLevels, isGroupVisible } from "@/world/visibility";
import { getMaterial } from "./materials";
import { PERSON_SLOTS, type PersonSlot, getPersonGeometry } from "./personGeometry";
import { getPropParts } from "./propCatalog";

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const tmpObj = new THREE.Object3D();
const zero = new THREE.Matrix4().makeScale(0, 0, 0);
const tmpColor = new THREE.Color();
const tmpDir = new THREE.Vector3();

const NO_SHADOW: MaterialKey[] = ["glass", "glassDark", "screen", "glow"];
const FACING_NORMALS: Array<[number, number]> = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0],
];

function facingBit(nx: number, nz: number) {
  return FACING_NORMALS.findIndex(([x, z]) => Math.abs(x - nx) < 0.01 && Math.abs(z - nz) < 0.01);
}

/* ------------------------------------------------------------------ boxes */

interface BoxBatchProps {
  material: MaterialKey;
  boxes: BoxDef[];
  cut: CutLevels;
  facingMask: number;
}

function BoxBatch({ material, boxes, cut, facingMask }: BoxBatchProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    boxes.forEach((b, i) => {
      if (!isGroupVisible(b.group, cut)) {
        mesh.setMatrixAt(i, zero);
        return;
      }
      const [x, , z] = b.p;
      let y = b.p[1];
      let h = b.s[1];
      if (b.cut) {
        const bit = facingBit(b.cut.nx, b.cut.nz);
        if (bit >= 0 && facingMask & (1 << bit)) {
          const bottom = y - h / 2;
          const top = Math.min(y + h / 2, b.cut.cutTop);
          if (top <= bottom + 0.01) {
            mesh.setMatrixAt(i, zero);
            return;
          }
          h = top - bottom;
          y = bottom + h / 2;
        }
      }
      tmpObj.position.set(x, y, z);
      tmpObj.rotation.set(0, b.ry ?? 0, 0);
      tmpObj.scale.set(b.s[0], h, b.s[2]);
      tmpObj.updateMatrix();
      mesh.setMatrixAt(i, tmpObj.matrix);
      if (material === "tint") mesh.setColorAt(i, tmpColor.set(b.color ?? "#ffffff"));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes, cut, facingMask, material]);

  const shadow = !NO_SHADOW.includes(material);
  return (
    <instancedMesh
      ref={ref}
      args={[unitBox, getMaterial(material), boxes.length]}
      castShadow={shadow}
      receiveShadow={material !== "glass"}
      renderOrder={material === "glass" ? 2 : 0}
      frustumCulled={false}
    />
  );
}

function useCameraFacingMask() {
  const mask = useRef(0);
  const setMask = useExperience((s) => s.setFacingMask);
  useFrame(({ camera }) => {
    camera.getWorldDirection(tmpDir);
    const len = Math.hypot(tmpDir.x, tmpDir.z) || 1;
    const cx = -tmpDir.x / len;
    const cz = -tmpDir.z / len;
    let m = 0;
    FACING_NORMALS.forEach(([nx, nz], i) => {
      if (nx * cx + nz * cz > 0.2) m |= 1 << i;
    });
    if (m !== mask.current) {
      mask.current = m;
      setMask(m);
    }
  });
}

export function BoxBatches() {
  const world = getWorld();
  const cut = useExperience((s) => s.cutLevels);
  const facingMask = useExperience((s) => s.facingMask);
  useCameraFacingMask();
  const batches = useMemo(() => {
    const map = new Map<MaterialKey, BoxDef[]>();
    for (const b of world.boxes) {
      const list = map.get(b.m) ?? [];
      list.push(b);
      map.set(b.m, list);
    }
    return [...map.entries()];
  }, [world]);
  return (
    <>
      {batches.map(([m, boxes]) => (
        <BoxBatch key={m} material={m} boxes={boxes} cut={cut} facingMask={facingMask} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ props */

function PropTypeInstances({ type, props, cut }: { type: PropType; props: PropDef[]; cut: CutLevels }) {
  const parts = getPropParts(type);
  const refs = useRef<Array<THREE.InstancedMesh | null>>([]);
  useLayoutEffect(() => {
    parts.forEach((part, pi) => {
      const mesh = refs.current[pi];
      if (!mesh) return;
      props.forEach((p, i) => {
        if (!isGroupVisible(p.group, cut)) {
          mesh.setMatrixAt(i, zero);
        } else {
          tmpObj.position.set(p.p[0], p.p[1], p.p[2]);
          tmpObj.rotation.set(0, p.ry, 0);
          tmpObj.scale.setScalar(p.scale ?? 1);
          tmpObj.updateMatrix();
          mesh.setMatrixAt(i, tmpObj.matrix);
        }
        if (part.tint) mesh.setColorAt(i, tmpColor.set(p.color ?? part.tint));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [parts, props, cut]);
  return (
    <>
      {parts.map((part, pi) => (
        <instancedMesh
          key={pi}
          ref={(el) => {
            refs.current[pi] = el;
          }}
          args={[part.geometry, getMaterial(part.material), props.length]}
          castShadow={part.castShadow !== false && !NO_SHADOW.includes(part.material)}
          receiveShadow
          frustumCulled={false}
        />
      ))}
    </>
  );
}

export function PropInstances() {
  const world = getWorld();
  const cut = useExperience((s) => s.cutLevels);
  const byType = useMemo(() => {
    const map = new Map<PropType, PropDef[]>();
    for (const p of world.props) {
      const list = map.get(p.type) ?? [];
      list.push(p);
      map.set(p.type, list);
    }
    return [...map.entries()];
  }, [world]);
  return (
    <>
      {byType.map(([type, props]) => (
        <PropTypeInstances key={type} type={type} props={props} cut={cut} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ background people */

function slotColor(n: NpcDef, slot: PersonSlot) {
  return slot === "skin" ? n.skin : slot === "shirt" ? n.shirt : slot === "pants" ? n.pants : slot === "hair" ? n.hair : "#1d1f23";
}

function NpcPoseInstances({ pose, npcs, cut }: { pose: "sit" | "stand"; npcs: NpcDef[]; cut: CutLevels }) {
  const refs = useRef<Array<THREE.InstancedMesh | null>>([]);
  useLayoutEffect(() => {
    PERSON_SLOTS.forEach((slot, si) => {
      const mesh = refs.current[si];
      if (!mesh) return;
      npcs.forEach((n, i) => {
        if (!isGroupVisible(n.group, cut)) mesh.setMatrixAt(i, zero);
        else {
          tmpObj.position.set(n.p[0], n.p[1], n.p[2]);
          tmpObj.rotation.set(0, n.ry, 0);
          tmpObj.scale.setScalar(1);
          tmpObj.updateMatrix();
          mesh.setMatrixAt(i, tmpObj.matrix);
        }
        mesh.setColorAt(i, tmpColor.set(slotColor(n, slot)));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [npcs, cut]);
  return (
    <>
      {PERSON_SLOTS.map((slot, si) => (
        <instancedMesh
          key={slot}
          ref={(el) => {
            refs.current[si] = el;
          }}
          args={[getPersonGeometry(pose, slot), getMaterial("tint"), npcs.length]}
          castShadow
          receiveShadow
          frustumCulled={false}
        />
      ))}
    </>
  );
}

export function NpcInstances() {
  const world = getWorld();
  const cut = useExperience((s) => s.cutLevels);
  const sit = useMemo(() => world.npcs.filter((n) => n.pose === "sit"), [world]);
  const stand = useMemo(() => world.npcs.filter((n) => n.pose === "stand"), [world]);
  return (
    <>
      <NpcPoseInstances pose="sit" npcs={sit} cut={cut} />
      <NpcPoseInstances pose="stand" npcs={stand} cut={cut} />
    </>
  );
}
