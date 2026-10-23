"use client";

import { useFrame } from "@react-three/fiber";
import { type RefObject, useMemo, useRef } from "react";
import type * as THREE from "three";
import type { CharacterLook } from "@/world/types";
import { getColorMaterial } from "./materials";
import { BODY, rigGeometry } from "./personGeometry";

/** Mutable animation input written by controllers every frame. */
export interface CharacterAnim {
  /** 0 = idle, 1 = full walk/run cycle. */
  amount: number;
  /** Stride frequency multiplier (≈ speed). */
  speed: number;
  /** Set by the model; walk-cycle phase. */
  phase: number;
}

export function createAnim(phase = 0): CharacterAnim {
  return { amount: 0, speed: 0, phase };
}

interface Props {
  look: CharacterLook;
  anim: RefObject<CharacterAnim>;
  castShadow?: boolean;
  /** Idle variation seed. */
  seed?: number;
}

/**
 * Procedurally animated humanoid (walk cycle + idle breathing). Shared geometry
 * and per-colour materials keep the cost to a handful of small meshes per character.
 */
export function CharacterModel({ look, anim, castShadow = true, seed = 0 }: Props) {
  const body = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  const m = useMemo(
    () => ({
      skin: getColorMaterial(look.skin, 0.7),
      shirt: getColorMaterial(look.shirt, 0.85),
      pants: getColorMaterial(look.pants, 0.9),
      hair: getColorMaterial(look.hair, 0.75),
      shoes: getColorMaterial("#1d1f23", 0.6),
      collar: getColorMaterial("#f4f5f7", 0.85),
      backpack: getColorMaterial("#7a5232", 0.85),
    }),
    [look.skin, look.shirt, look.pants, look.hair],
  );

  const g = useMemo(
    () => ({
      leg: rigGeometry.leg(),
      shoe: rigGeometry.shoe(),
      hips: rigGeometry.hips(),
      torso: rigGeometry.torso(),
      collar: rigGeometry.jacketCollar(),
      neck: rigGeometry.neck(),
      head: rigGeometry.head(),
      hair: rigGeometry.hair(),
      hairLong: rigGeometry.hairLong(),
      hairBun: rigGeometry.hairBun(),
      backpack: rigGeometry.backpack(),
      arm: rigGeometry.arm(),
      hand: rigGeometry.hand(),
    }),
    [],
  );

  useFrame((state, dt) => {
    const a = anim.current;
    if (!a || !body.current || !torso.current) return;
    const t = state.clock.elapsedTime + seed;
    const delta = Math.min(dt, 0.05);
    a.phase += delta * (5 + a.speed * 1.55) * (a.amount > 0.02 ? 1 : 0);
    const s = Math.sin(a.phase);
    const w = a.amount;
    const swing = 0.62 * w;
    if (legL.current) legL.current.rotation.x = s * swing;
    if (legR.current) legR.current.rotation.x = -s * swing;
    if (armL.current) {
      armL.current.rotation.x = -s * 0.55 * w;
      armL.current.rotation.z = -0.05 - Math.sin(t * 1.3) * 0.015 * (1 - w);
    }
    if (armR.current) {
      armR.current.rotation.x = s * 0.55 * w;
      armR.current.rotation.z = 0.05 + Math.sin(t * 1.3) * 0.015 * (1 - w);
    }
    body.current.position.y = Math.abs(Math.cos(a.phase)) * 0.045 * w;
    torso.current.rotation.y = s * 0.08 * w;
    torso.current.rotation.x = 0.05 * w;
    torso.current.scale.y = 1 + Math.sin(t * 2.1) * 0.008 * (1 - w);
    if (head.current) head.current.rotation.y = Math.sin(t * 0.45) * 0.25 * (1 - w);
  });

  const sh = castShadow;
  return (
    <group ref={body}>
      <mesh geometry={g.hips} material={m.pants} castShadow={sh} />
      <group ref={legL} position={[-BODY.legX, BODY.hipY, 0]}>
        <mesh geometry={g.leg} material={m.pants} castShadow={sh} />
        <mesh geometry={g.shoe} material={m.shoes} castShadow={sh} />
      </group>
      <group ref={legR} position={[BODY.legX, BODY.hipY, 0]}>
        <mesh geometry={g.leg} material={m.pants} castShadow={sh} />
        <mesh geometry={g.shoe} material={m.shoes} castShadow={sh} />
      </group>
      <group ref={torso} position={[0, BODY.hipY, 0]}>
        <mesh geometry={g.torso} material={m.shirt} castShadow={sh} />
        {look.jacket && <mesh geometry={g.collar} material={m.collar} />}
        <mesh geometry={g.neck} material={m.skin} />
        <group ref={head}>
          <mesh geometry={g.head} material={m.skin} castShadow={sh} />
          <mesh geometry={g.hair} material={m.hair} />
          {look.hairStyle === "long" && <mesh geometry={g.hairLong} material={m.hair} />}
          {look.hairStyle === "bun" && <mesh geometry={g.hairBun} material={m.hair} />}
        </group>
        {look.backpack && <mesh geometry={g.backpack} material={m.backpack} castShadow={sh} />}
        <group ref={armL} position={[-BODY.shoulderX, BODY.shoulderY - BODY.hipY, 0]}>
          <mesh geometry={g.arm} material={m.shirt} castShadow={sh} />
          <mesh geometry={g.hand} material={m.skin} />
        </group>
        <group ref={armR} position={[BODY.shoulderX, BODY.shoulderY - BODY.hipY, 0]}>
          <mesh geometry={g.arm} material={m.shirt} castShadow={sh} />
          <mesh geometry={g.hand} material={m.skin} />
        </group>
      </group>
    </group>
  );
}
