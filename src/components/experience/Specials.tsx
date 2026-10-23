"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { VisibilityGroup as Group } from "@/types/experience";
import { getWorld } from "@/world/campus";
import type { SpecialDef } from "@/world/types";
import { getMaterial } from "./materials";
import { VisibilityGroup } from "./VisibilityGroup";

const M = {
  white: () => getMaterial("white"),
  frame: () => getMaterial("frame"),
  metal: () => getMaterial("metal"),
  glass: () => getMaterial("glass"),
  woodLight: () => getMaterial("woodLight"),
  woodDark: () => getMaterial("woodDark"),
  woodMid: () => getMaterial("woodMid"),
  concrete: () => getMaterial("concrete"),
  black: () => getMaterial("black"),
  glow: () => getMaterial("glow"),
};

let waterMat: THREE.MeshStandardMaterial | null = null;
function poolWater() {
  if (!waterMat) waterMat = new THREE.MeshStandardMaterial({ color: "#47c6e6", roughness: 0.08, metalness: 0.05, emissive: "#0a5a73", emissiveIntensity: 0.35, envMapIntensity: 1.4 });
  return waterMat;
}
let accentMat: THREE.MeshBasicMaterial | null = null;
function accentGlow() {
  if (!accentMat) accentMat = new THREE.MeshBasicMaterial({ color: "#5aa2ff", toneMapped: false });
  return accentMat;
}

function Fountain({ d }: { d: SpecialDef }) {
  const r = d.size?.[0] ?? 4.4;
  const jet = useRef<THREE.Mesh>(null);
  const spray = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e8f8ff", transparent: true, opacity: 0.75, roughness: 0.1, emissive: "#9edcff", emissiveIntensity: 0.25 }), []);
  useFrame(({ clock }) => {
    if (jet.current) jet.current.scale.y = 1 + Math.sin(clock.elapsedTime * 3) * 0.06;
  });
  return (
    <group position={d.p}>
      <mesh position={[0, 0.25, 0]} material={M.concrete()} castShadow receiveShadow>
        <cylinderGeometry args={[r, r + 0.15, 0.5, 40]} />
      </mesh>
      <mesh position={[0, 0.47, 0]} material={poolWater()}>
        <cylinderGeometry args={[r - 0.35, r - 0.35, 0.06, 40]} />
      </mesh>
      <mesh position={[0, 0.9, 0]} material={M.white()} castShadow>
        <cylinderGeometry args={[0.6, 0.9, 1.0, 20]} />
      </mesh>
      <mesh position={[0, 1.45, 0]} material={M.white()} castShadow>
        <cylinderGeometry args={[1.5, 0.7, 0.25, 24]} />
      </mesh>
      <mesh position={[0, 1.6, 0]} material={poolWater()}>
        <cylinderGeometry args={[1.35, 1.35, 0.05, 24]} />
      </mesh>
      <mesh ref={jet} position={[0, 2.6, 0]} material={spray}>
        <coneGeometry args={[0.32, 2.2, 12, 1, true]} />
      </mesh>
      <mesh position={[0, 3.75, 0]} material={spray}>
        <sphereGeometry args={[0.28, 10, 8]} />
      </mesh>
    </group>
  );
}

function ReceptionDesk({ d }: { d: SpecialDef }) {
  const [w, h, dd] = d.size ?? [5, 1.1, 1];
  return (
    <group position={d.p} rotation-y={d.ry}>
      <mesh position={[0, h / 2, 0]} material={M.white()} castShadow receiveShadow>
        <boxGeometry args={[w, h, dd]} />
      </mesh>
      <mesh position={[0, h + 0.03, 0.05]} material={M.woodLight()} castShadow>
        <boxGeometry args={[w + 0.1, 0.06, dd + 0.15]} />
      </mesh>
      <mesh position={[0, 0.12, dd / 2 + 0.01]} material={accentGlow()}>
        <boxGeometry args={[w * 0.92, 0.05, 0.02]} />
      </mesh>
      <mesh position={[-w * 0.3, h + 0.28, -0.15]} material={M.black()}>
        <boxGeometry args={[0.55, 0.36, 0.04]} />
      </mesh>
      <mesh position={[w * 0.15, h + 0.28, -0.15]} material={M.black()}>
        <boxGeometry args={[0.55, 0.36, 0.04]} />
      </mesh>
    </group>
  );
}

/** Walnut executive desk with modesty panel and drawer pedestal (CEO cabin). */
function ExecDesk({ d }: { d: SpecialDef }) {
  const [w, h, dd] = d.size ?? [2.4, 0.76, 1.1];
  return (
    <group position={d.p} rotation-y={d.ry}>
      <mesh position={[0, h, 0]} material={M.woodDark()} castShadow receiveShadow>
        <boxGeometry args={[w, 0.07, dd]} />
      </mesh>
      <mesh position={[0, h * 0.55, dd / 2 - 0.06]} material={M.woodMid()} castShadow>
        <boxGeometry args={[w - 0.1, h * 0.75, 0.05]} />
      </mesh>
      <mesh position={[w / 2 - 0.3, h / 2, 0]} material={M.woodMid()} castShadow>
        <boxGeometry args={[0.52, h - 0.04, dd - 0.12]} />
      </mesh>
      <mesh position={[-w / 2 + 0.06, h / 2, 0]} material={M.woodMid()} castShadow>
        <boxGeometry args={[0.08, h - 0.04, dd - 0.12]} />
      </mesh>
      <mesh position={[w / 2 - 0.3, h * 0.7, -dd / 2 + 0.05]} material={M.metal()}>
        <boxGeometry args={[0.3, 0.025, 0.02]} />
      </mesh>
    </group>
  );
}

function Table({ d, round }: { d: SpecialDef; round?: boolean }) {
  const [w, h, dd] = d.size ?? [2, 0.76, 1];
  return (
    <group position={d.p} rotation-y={d.ry}>
      {round ? (
        <mesh position={[0, h, 0]} material={M.woodLight()} castShadow receiveShadow>
          <cylinderGeometry args={[w / 2 + 0.3, w / 2 + 0.3, 0.05, 28]} />
        </mesh>
      ) : (
        <mesh position={[0, h, 0]} material={M.woodLight()} castShadow receiveShadow>
          <boxGeometry args={[w, 0.06, dd]} />
        </mesh>
      )}
      {round ? (
        <mesh position={[0, h / 2, 0]} material={M.frame()}>
          <cylinderGeometry args={[0.06, 0.28, h, 12]} />
        </mesh>
      ) : (
        <>
          <mesh position={[-w / 2 + 0.3, h / 2, 0]} material={M.frame()} castShadow>
            <boxGeometry args={[0.08, h, dd * 0.8]} />
          </mesh>
          <mesh position={[w / 2 - 0.3, h / 2, 0]} material={M.frame()} castShadow>
            <boxGeometry args={[0.08, h, dd * 0.8]} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Counter({ d }: { d: SpecialDef }) {
  const [w, h, dd] = d.size ?? [3, 1.05, 0.8];
  return (
    <group position={d.p} rotation-y={d.ry}>
      <mesh position={[0, h / 2, 0]} material={M.white()} castShadow receiveShadow>
        <boxGeometry args={[w, h, dd]} />
      </mesh>
      <mesh position={[0, h + 0.03, 0]} material={M.woodDark()} castShadow>
        <boxGeometry args={[w + 0.08, 0.06, dd + 0.1]} />
      </mesh>
      <mesh position={[w * 0.3, h + 0.2, 0]} material={M.metal()}>
        <boxGeometry args={[0.35, 0.34, 0.3]} />
      </mesh>
    </group>
  );
}

function ElevatorDoor({ d }: { d: SpecialDef }) {
  return (
    <group position={d.p} rotation-y={d.ry}>
      <mesh position={[0, 1.45, 0.02]} material={M.frame()}>
        <boxGeometry args={[2.3, 2.9, 0.08]} />
      </mesh>
      <mesh position={[-0.5, 1.3, 0.07]} material={M.metal()}>
        <boxGeometry args={[0.96, 2.5, 0.04]} />
      </mesh>
      <mesh position={[0.5, 1.3, 0.07]} material={M.metal()}>
        <boxGeometry args={[0.96, 2.5, 0.04]} />
      </mesh>
      <mesh position={[0, 2.7, 0.08]} material={accentGlow()}>
        <boxGeometry args={[0.5, 0.1, 0.02]} />
      </mesh>
      <mesh position={[1.35, 1.25, 0.08]} material={accentGlow()}>
        <boxGeometry args={[0.08, 0.2, 0.02]} />
      </mesh>
    </group>
  );
}

function Stairs({ d }: { d: SpecialDef }) {
  const [w, rise, depth] = d.size ?? [2.8, 4, 4.6];
  const steps = 14;
  const items = useMemo(() => Array.from({ length: steps }, (_, i) => i), []);
  return (
    <group position={d.p} rotation-y={d.ry}>
      {items.map((i) => {
        const h = (rise / steps) * (i + 1);
        const z = depth / 2 - (depth / steps) * (i + 0.5);
        return (
          <mesh key={i} position={[0, h / 2, z]} material={i % 2 ? M.woodLight() : M.woodMid()} castShadow receiveShadow>
            <boxGeometry args={[w, h, depth / steps]} />
          </mesh>
        );
      })}
      <mesh position={[w / 2 + 0.03, rise / 2 + 0.5, 0]} rotation-x={Math.atan2(rise, depth)} material={M.glass()}>
        <boxGeometry args={[0.04, 1.0, Math.hypot(rise, depth)]} />
      </mesh>
    </group>
  );
}

function Sailboat({ d }: { d: SpecialDef }) {
  const g = useRef<THREE.Group>(null);
  const sail = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0, 7.5);
    s.lineTo(3.4, 0.4);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);
  const sailMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", side: THREE.DoubleSide, roughness: 0.7 }), []);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.elapsedTime;
    g.current.position.y = -0.45 + Math.sin(t * 0.9) * 0.08;
    g.current.rotation.z = Math.sin(t * 0.7) * 0.03;
  });
  return (
    <group ref={g} position={d.p} rotation-y={d.ry}>
      <mesh position={[0, 0.35, 0]} material={M.white()} castShadow>
        <boxGeometry args={[2.0, 0.7, 5.6]} />
      </mesh>
      <mesh position={[0, 0.35, 3.3]} rotation-x={Math.PI / 2} material={M.white()} castShadow>
        <coneGeometry args={[1.0, 1.4, 4]} />
      </mesh>
      <mesh position={[0, 0.75, -0.6]} material={M.woodMid()}>
        <boxGeometry args={[1.6, 0.12, 2.6]} />
      </mesh>
      <mesh position={[0, 4.5, 0.4]} material={M.metal()} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 8, 8]} />
      </mesh>
      <mesh position={[0.05, 0.9, 0.4]} rotation-y={-Math.PI / 2} geometry={sail} material={sailMat} castShadow />
    </group>
  );
}

function Pool({ d }: { d: SpecialDef }) {
  const [w, , dd] = d.size ?? [16, 0, 9];
  return (
    <group position={d.p}>
      <mesh position={[0, 0.06, 0]} material={M.white()} receiveShadow castShadow>
        <boxGeometry args={[w + 0.8, 0.12, dd + 0.8]} />
      </mesh>
      <mesh position={[0, 0.125, 0]} material={poolWater()}>
        <boxGeometry args={[w, 0.02, dd]} />
      </mesh>
    </group>
  );
}

function Gate({ d }: { d: SpecialDef }) {
  const [w, h] = d.size ?? [8.6, 4.8, 0.8];
  return (
    <group position={d.p} rotation-y={d.ry}>
      {[-w / 2, w / 2].map((x) => (
        <mesh key={x} position={[x, h / 2, 0]} material={M.white()} castShadow receiveShadow>
          <boxGeometry args={[0.9, h, 0.9]} />
        </mesh>
      ))}
      <mesh position={[0, h - 0.6, 0]} material={M.frame()} castShadow>
        <boxGeometry args={[w + 0.9, 0.9, 0.7]} />
      </mesh>
    </group>
  );
}

function Skylight({ d }: { d: SpecialDef }) {
  const [w, h, dd] = d.size ?? [6, 1.4, 6];
  return (
    <group position={d.p}>
      <mesh position={[0, 0.2, 0]} material={M.frame()} castShadow>
        <boxGeometry args={[w + 0.3, 0.4, dd + 0.3]} />
      </mesh>
      <mesh position={[0, 0.4 + h / 2, 0]} material={getMaterial("glassDark")}>
        <boxGeometry args={[w, h, dd]} />
      </mesh>
      {[-1, 0, 1].map((i) => (
        <mesh key={i} position={[(i * w) / 3, 0.4 + h / 2, 0]} material={M.frame()}>
          <boxGeometry args={[0.08, h + 0.02, dd + 0.02]} />
        </mesh>
      ))}
    </group>
  );
}

function Canopy({ d }: { d: SpecialDef }) {
  const [w, t, dd] = d.size ?? [7, 0.25, 3.4];
  return (
    <group position={d.p}>
      <mesh material={M.white()} castShadow receiveShadow>
        <boxGeometry args={[w, t, dd]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.3), -d.p[1] / 2, dd / 2 - 0.3]} material={M.frame()} castShadow>
          <cylinderGeometry args={[0.07, 0.07, d.p[1], 8]} />
        </mesh>
      ))}
    </group>
  );
}

function Pier({ d }: { d: SpecialDef }) {
  const [w, , dd] = d.size ?? [6, 0, 11];
  const posts = useMemo(() => {
    const out: Array<[number, number]> = [];
    for (let z = -dd / 2 + 0.5; z <= dd / 2; z += 2.2) {
      out.push([-w / 2 + 0.2, z], [w / 2 - 0.2, z]);
    }
    return out;
  }, [w, dd]);
  return (
    <group position={d.p}>
      <mesh position={[0, -0.12, 0]} material={M.woodMid()} receiveShadow castShadow>
        <boxGeometry args={[w, 0.3, dd]} />
      </mesh>
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, -0.6, z]} material={M.woodDark()}>
          <cylinderGeometry args={[0.16, 0.16, 1.2, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function Special({ d }: { d: SpecialDef }) {
  switch (d.kind) {
    case "fountain":
      return <Fountain d={d} />;
    case "receptionDesk":
      return <ReceptionDesk d={d} />;
    case "execDesk":
      return <ExecDesk d={d} />;
    case "table":
      return <Table d={d} />;
    case "roundTable":
      return <Table d={d} round />;
    case "counter":
      return <Counter d={d} />;
    case "elevatorDoor":
      return <ElevatorDoor d={d} />;
    case "stairs":
      return <Stairs d={d} />;
    case "sailboat":
      return <Sailboat d={d} />;
    case "pool":
      return <Pool d={d} />;
    case "gate":
      return <Gate d={d} />;
    case "skylight":
      return <Skylight d={d} />;
    case "canopy":
      return <Canopy d={d} />;
    case "pier":
      return <Pier d={d} />;
  }
}

export function Specials() {
  const byGroup = useMemo(() => {
    const m = new Map<Group, SpecialDef[]>();
    for (const s of getWorld().specials) m.set(s.group, [...(m.get(s.group) ?? []), s]);
    return [...m.entries()];
  }, []);
  return (
    <>
      {byGroup.map(([group, list]) => (
        <VisibilityGroup key={group} group={group}>
          {list.map((d) => (
            <Special key={d.id} d={d} />
          ))}
        </VisibilityGroup>
      ))}
    </>
  );
}
