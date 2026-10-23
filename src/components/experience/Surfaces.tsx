"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { VisibilityGroup as Group } from "@/types/experience";
import { getWorld } from "@/world/campus";
import type { SurfaceDef } from "@/world/types";
import { company } from "@/data/company";
import { allRooms, getDepartment } from "@/lib/organization";
import { type DirectoryLine, directoryTexture, logoWallTexture, screenTexture, signTexture } from "./textures";
import { VisibilityGroup } from "./VisibilityGroup";

const plane = new THREE.PlaneGeometry(1, 1);

/** Floors and rooms for the building directory boards, straight from the office layout. */
function directoryColumns(): DirectoryLine[] {
  const groups: Array<{ heading: string; match: (b: string, l: string) => boolean }> = [
    { heading: "HQ · Ground floor", match: (b, l) => b === "hq" && l === "ground" },
    { heading: "HQ · Level 1", match: (b, l) => b === "hq" && l === "hq-1" },
    { heading: "HQ · Rooftop", match: (b, l) => b === "hq" && l === "hq-roof" },
    { heading: "Marketing pavilion", match: (b) => b === "marketing" },
    { heading: "Sales pavilion", match: (b) => b === "sales" },
  ];
  return groups.map((g) => {
    const rooms = allRooms().filter((r) => r.listed !== false && g.match(r.buildingId, r.level));
    const color = rooms.map((r) => (r.departmentId ? getDepartment(r.departmentId)?.color : undefined)).find(Boolean);
    return { heading: g.heading, items: rooms.map((r) => r.name), color };
  });
}
const matCache = new Map<string, THREE.Material>();

function materialFor(s: SurfaceDef): THREE.Material {
  const key = `${s.kind}|${s.variant ?? 0}|${s.text ?? ""}`;
  let m = matCache.get(key);
  if (m) return m;
  switch (s.kind) {
    case "sign":
      m = new THREE.MeshBasicMaterial({ map: signTexture(s.text ?? "", s.variant ?? 0), transparent: true, toneMapped: false, depthWrite: false });
      break;
    case "logoWall":
      m = new THREE.MeshBasicMaterial({ map: logoWallTexture(company.name), transparent: true, toneMapped: false, depthWrite: false });
      break;
    case "directory":
      m = new THREE.MeshBasicMaterial({ map: directoryTexture(company.name, directoryColumns()), toneMapped: false });
      break;
    case "art":
    case "timeline":
    case "moodboard":
    case "whiteboard":
    case "poster":
      m = new THREE.MeshStandardMaterial({ map: screenTexture(s.kind, s.variant ?? 0, s.text ?? ""), roughness: 0.7 });
      break;
    default: {
      const kind = s.kind === "tv" || s.kind === "chart" || s.kind === "kiosk" || s.kind === "project" ? s.kind : "monitor";
      m = new THREE.MeshBasicMaterial({ map: screenTexture(kind, s.variant ?? 0), toneMapped: false });
    }
  }
  matCache.set(key, m);
  return m;
}

function Surface({ s }: { s: SurfaceDef }) {
  const material = materialFor(s);
  // Screens get a thin dark bezel so they read as devices.
  const bezel = s.emissive && s.kind !== "kiosk" && s.kind !== "directory";
  return (
    <group position={s.p} rotation-y={s.ry}>
      {bezel && (
        <mesh position={[0, 0, -0.012]} scale={[s.w + 0.08, s.h + 0.08, 1]} geometry={plane}>
          <meshStandardMaterial color="#15181d" roughness={0.4} />
        </mesh>
      )}
      <mesh geometry={plane} material={material} scale={[s.w, s.h, 1]} renderOrder={s.kind === "sign" || s.kind === "logoWall" ? 3 : 0} />
    </group>
  );
}

/** Signage, screens and artwork (canvas-painted, no image downloads). */
export function Surfaces() {
  const byGroup = useMemo(() => {
    const m = new Map<Group, SurfaceDef[]>();
    for (const s of getWorld().surfaces) m.set(s.group, [...(m.get(s.group) ?? []), s]);
    return [...m.entries()];
  }, []);
  return (
    <>
      {byGroup.map(([group, list]) => (
        <VisibilityGroup key={group} group={group}>
          {list.map((s) => (
            <Surface key={s.id} s={s} />
          ))}
        </VisibilityGroup>
      ))}
    </>
  );
}
