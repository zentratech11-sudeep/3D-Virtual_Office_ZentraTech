"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type * as THREE from "three";
import { getWorld } from "@/world/campus";
import type { FeaturedPersonDef, WalkerRoute } from "@/world/types";
import { type CharacterAnim, CharacterModel, createAnim } from "./CharacterModel";
import { VisibilityGroup } from "./VisibilityGroup";

function FeaturedPerson({ def, index }: { def: FeaturedPersonDef; index: number }) {
  const anim = useRef<CharacterAnim>(createAnim(index));
  return (
    <group position={def.p} rotation-y={def.ry} name={def.id}>
      <CharacterModel look={def.look} anim={anim} seed={index * 1.7} />
    </group>
  );
}

/** Named team members (selectable, gently animated). */
export function FeaturedPeople() {
  const list = getWorld().featured;
  return (
    <>
      {list.map((def, i) => (
        <VisibilityGroup key={def.id} group={def.group}>
          <FeaturedPerson def={def} index={i} />
        </VisibilityGroup>
      ))}
    </>
  );
}

function Walker({ route, index }: { route: WalkerRoute; index: number }) {
  const g = useRef<THREE.Group>(null);
  const anim = useRef<CharacterAnim>(createAnim(index * 2.1));
  const lengths = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < route.points.length; i++) {
      const a = route.points[i];
      const b = route.points[(i + 1) % route.points.length];
      out.push(Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    return out;
  }, [route]);
  const total = useMemo(() => lengths.reduce((s, l) => s + l, 0), [lengths]);
  const dist = useRef((index * 37) % total);

  useFrame((_, dt) => {
    if (!g.current) return;
    dist.current = (dist.current + Math.min(dt, 0.05) * route.speed) % total;
    let d = dist.current;
    let i = 0;
    while (d > lengths[i]) {
      d -= lengths[i];
      i = (i + 1) % lengths.length;
    }
    const a = route.points[i];
    const b = route.points[(i + 1) % route.points.length];
    const t = lengths[i] > 0 ? d / lengths[i] : 0;
    g.current.position.set(a[0] + (b[0] - a[0]) * t, 0.03, a[1] + (b[1] - a[1]) * t);
    g.current.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    anim.current.amount = 0.8;
    anim.current.speed = route.speed;
  });

  return (
    <group ref={g}>
      <CharacterModel look={route.look} anim={anim} seed={index} />
    </group>
  );
}

/** Ambient people strolling around the campus (high quality only). */
export function Walkers() {
  const routes = getWorld().walkers;
  return (
    <>
      {routes.map((r, i) => (
        <Walker key={r.id} route={r} index={i} />
      ))}
    </>
  );
}
