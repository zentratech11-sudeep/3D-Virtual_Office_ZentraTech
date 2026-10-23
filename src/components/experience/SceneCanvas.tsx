"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { cameraConfig, qualityTiers } from "@/config/office";
import { runtime } from "@/lib/runtime";
import { useExperience } from "@/lib/store";
import { CameraRig } from "./CameraRig";
import { CharacterController } from "./CharacterController";
import { Cutaway } from "./Cutaway";
import { DestinationMarkers } from "./DestinationMarkers";
import { Effects } from "./Effects";
import { Floors } from "./Floors";
import { Hitboxes, Pickables } from "./InteractiveObject";
import { Lighting } from "./Lighting";
import { FeaturedPeople, Walkers } from "./Staff";
import { Specials } from "./Specials";
import { BoxBatches, NpcInstances, PropInstances } from "./StaticWorld";
import { Surfaces } from "./Surfaces";
import { Terrain } from "./Terrain";

const SKY = "#cfe7f3";

/** Debug-only A/B switches for performance profiling (`?debug=1&ao=0&msaa=0&shadows=0`). */
function debugOverrides() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  if (!p.has("debug")) return {};
  const flag = (k: string) => (p.has(k) ? p.get(k) !== "0" : undefined);
  return { ao: flag("ao"), shadows: flag("shadows"), msaa: p.has("msaa") ? Number(p.get("msaa")) : undefined };
}

/** Signals readiness once real frames have been rendered (not just mounted). */
function SceneReady() {
  const frames = useRef(0);
  const done = useRef(false);
  const setLoadProgress = useExperience((s) => s.setLoadProgress);
  useEffect(() => setLoadProgress(0.8, "Building the campus"), [setLoadProgress]);
  useFrame(() => {
    if (done.current) return;
    frames.current++;
    if (frames.current === 3) {
      done.current = true;
      setLoadProgress(1, "Ready");
      useExperience.getState().dispatch({ type: "SCENE_READY" });
    }
  });
  return null;
}

/** Renderer statistics for the debug overlay / performance checks. */
function Stats() {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ t: 0, frames: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    a.t += dt;
    a.frames++;
    if (a.t >= 1) {
      runtime.stats.fps = Math.round(a.frames / a.t);
      runtime.stats.calls = gl.info.render.calls;
      runtime.stats.triangles = gl.info.render.triangles;
      a.t = 0;
      a.frames = 0;
    }
  });
  return null;
}

function ContextLossGuard() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      useExperience.getState().dispatch({ type: "SCENE_FAILED", reason: "The 3D view stopped responding (graphics context lost)." });
    };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl]);
  return null;
}

export default function SceneCanvas() {
  const tier = useExperience((s) => s.qualityTier);
  const setQualityTier = useExperience((s) => s.setQualityTier);
  const setLoadProgress = useExperience((s) => s.setLoadProgress);
  const [overrides] = useState(debugOverrides);
  const base = qualityTiers[tier];
  const q = { ...base, ambientOcclusion: overrides.ao ?? base.ambientOcclusion, shadows: overrides.shadows ?? base.shadows };
  // Antialiasing is fixed when the context is created.
  const [antialias] = useState(q.antialias);

  useEffect(() => setLoadProgress(0.4, "Starting the 3D engine"), [setLoadProgress]);

  return (
    <Canvas
      shadows={q.shadows ? "percentage" : false}
      dpr={q.dpr}
      gl={{ antialias, powerPreference: "high-performance", alpha: false, stencil: false }}
      camera={{ fov: cameraConfig.fov, near: cameraConfig.near, far: cameraConfig.far, position: [80, 120, 120] }}
      onCreated={() => setLoadProgress(0.6, "Lighting the scene")}
      style={{ touchAction: "none" }}
      aria-hidden
    >
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 300, 760]} />
      <ContextLossGuard />
      <PerformanceMonitor
        ms={600}
        iterations={6}
        onDecline={() => {
          if (useExperience.getState().qualityPreference === "auto") setQualityTier("low");
        }}
      />
      <Lighting quality={q} />
      <Terrain animatedWater={q.animatedWater} />
      <Pickables>
        <Floors />
        <Hitboxes />
      </Pickables>
      <BoxBatches />
      <PropInstances />
      <NpcInstances />
      <Specials />
      <Surfaces />
      <FeaturedPeople />
      {q.walkers && <Walkers />}
      <CharacterController />
      <DestinationMarkers />
      <Cutaway />
      <CameraRig />
      {q.ambientOcclusion && <Effects multisampling={overrides.msaa ?? 0} />}
      <Stats />
      <SceneReady />
    </Canvas>
  );
}
