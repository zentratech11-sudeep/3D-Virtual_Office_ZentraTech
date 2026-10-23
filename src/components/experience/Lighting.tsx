"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { QualitySettings } from "@/config/office";
import { runtime } from "@/lib/runtime";

const SUN_OFFSET = new THREE.Vector3(-70, 110, 42);

/**
 * Warm late-morning sun with a shadow frustum that follows the camera target and
 * scales with zoom, a sky/ground hemisphere fill, and a light-former environment for
 * glass and metal reflections (no HDR download).
 */
export function Lighting({ quality }: { quality: QualitySettings }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const lastSize = useRef(0);

  useEffect(() => {
    const l = sun.current;
    if (!l) return;
    l.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    l.shadow.bias = -0.0006;
    l.shadow.normalBias = 0.06;
    l.shadow.camera.near = 10;
    l.shadow.camera.far = 400;
    l.shadow.map?.dispose();
    l.shadow.map = null;
  }, [quality.shadowMapSize]);

  useFrame(() => {
    const l = sun.current;
    if (!l) return;
    const c = runtime.camera;
    // Snap to a coarse grid so shadows don't shimmer while panning.
    const snap = 2;
    const tx = Math.round(c.targetX / snap) * snap;
    const tz = Math.round(c.targetZ / snap) * snap;
    l.target.position.set(tx, 0, tz);
    l.position.set(tx + SUN_OFFSET.x, SUN_OFFSET.y, tz + SUN_OFFSET.z);
    l.target.updateMatrixWorld();
    const size = THREE.MathUtils.clamp(Math.round((c.distance * 0.75) / 5) * 5, 30, 110);
    if (size !== lastSize.current) {
      lastSize.current = size;
      const cam = l.shadow.camera;
      cam.left = -size;
      cam.right = size;
      cam.top = size;
      cam.bottom = -size;
      cam.updateProjectionMatrix();
    }
  });

  return (
    <>
      <hemisphereLight args={["#dcefff", "#7d8f55", 1.1]} />
      <ambientLight intensity={0.2} />
      <directionalLight ref={sun} color="#ffeccc" intensity={2.9} castShadow={quality.shadows} />
      {quality.environment && (
        <Environment resolution={128} frames={1} environmentIntensity={0.55}>
          <Lightformer form="rect" intensity={2.2} color="#dff1ff" scale={[60, 30, 1]} position={[0, 30, -40]} />
          <Lightformer form="rect" intensity={1.4} color="#ffffff" scale={[40, 20, 1]} position={[40, 20, 30]} rotation-y={-Math.PI / 3} />
          <Lightformer form="rect" intensity={1.2} color="#bfe0ff" scale={[40, 20, 1]} position={[-40, 20, 30]} rotation-y={Math.PI / 3} />
          <Lightformer form="circle" intensity={4} color="#fff3d6" scale={10} position={[-30, 50, 20]} />
          <Lightformer form="rect" intensity={0.6} color="#7fae5c" scale={[120, 120, 1]} position={[0, -10, 0]} rotation-x={Math.PI / 2} />
        </Environment>
      )}
    </>
  );
}
