"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { LAND, LAND_THICKNESS, WATER_Y } from "@/world/constants";
import { waterNormalTexture } from "./textures";

/** Island block (quay walls) and the animated harbour water. */
export function Terrain({ animatedWater }: { animatedWater: boolean }) {
  const water = useMemo(() => {
    const normalMap = waterNormalTexture().clone();
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(48, 48);
    normalMap.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      color: "#3a9fd8",
      roughness: 0.22,
      metalness: 0.08,
      normalMap,
      normalScale: new THREE.Vector2(0.32, 0.32),
      envMapIntensity: 1.1,
    });
  }, []);
  const quay = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c7bfb0", roughness: 0.95 }), []);
  const coping = useMemo(() => new THREE.MeshStandardMaterial({ color: "#efebe3", roughness: 0.8 }), []);

  useFrame((_, dt) => {
    if (!animatedWater || !water.normalMap) return;
    water.normalMap.offset.x += dt * 0.012;
    water.normalMap.offset.y += dt * 0.007;
  });

  const w = LAND.x1 - LAND.x0;
  const d = LAND.z1 - LAND.z0;
  const cx = (LAND.x0 + LAND.x1) / 2;
  const cz = (LAND.z0 + LAND.z1) / 2;
  return (
    <group>
      <mesh position={[cx, -LAND_THICKNESS / 2 - 0.01, cz]} material={quay} receiveShadow>
        <boxGeometry args={[w, LAND_THICKNESS, d]} />
      </mesh>
      {[
        [cx, LAND.z1 + 0.16, w + 0.64, 0.32],
        [cx, LAND.z0 - 0.16, w + 0.64, 0.32],
        [LAND.x0 - 0.16, cz, 0.32, d],
        [LAND.x1 + 0.16, cz, 0.32, d],
      ].map(([x, z, sx, sz], i) => (
        <mesh key={i} position={[x, -0.01, z]} material={coping} receiveShadow>
          <boxGeometry args={[sx, 0.14, sz]} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[cx, WATER_Y, cz]} material={water} receiveShadow>
        <planeGeometry args={[900, 900]} />
      </mesh>
    </group>
  );
}
