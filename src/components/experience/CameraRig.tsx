"use client";

import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getDestination } from "@/config/destinations";
import { getAnchor } from "@/config/interactions";
import { cameraConfig } from "@/config/office";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { isInputLocked } from "@/lib/experience-machine";
import { runtime } from "@/lib/runtime";
import { type CameraCommand, useExperience } from "@/lib/store";
import type { DestinationCamera } from "@/types/experience";
import { getWorld } from "@/world/campus";

const { ACTION } = CameraControlsImpl;
const DEG = Math.PI / 180;
const tmpTarget = new THREE.Vector3();
const tmpProj = new THREE.Vector3();

type RigMode = "intro" | "free" | "follow";

function offset(c: DestinationCamera): THREE.Vector3 {
  const az = c.azimuthDeg * DEG;
  const pol = c.polarDeg * DEG;
  return new THREE.Vector3(Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az)).multiplyScalar(c.distance);
}

/** Pull the overview camera back on narrow (portrait) viewports so the campus still fits. */
function overviewDistance(aspect: number) {
  const k = THREE.MathUtils.clamp(1.3 / Math.max(aspect, 0.3), 1, 1.4);
  return Math.min(cameraConfig.maxDistance, cameraConfig.overview.distance * k);
}

function configureInputs(c: CameraControlsImpl, mode: RigMode, locked: boolean) {
  c.enabled = !locked && mode !== "intro";
  c.mouseButtons.left = ACTION.ROTATE;
  c.mouseButtons.right = mode === "free" ? ACTION.TRUCK : ACTION.ROTATE;
  c.mouseButtons.middle = ACTION.DOLLY;
  c.mouseButtons.wheel = ACTION.DOLLY;
  c.touches.one = ACTION.TOUCH_ROTATE;
  c.touches.two = mode === "free" ? ACTION.TOUCH_DOLLY_TRUCK : ACTION.TOUCH_DOLLY;
  c.touches.three = mode === "free" ? ACTION.TOUCH_TRUCK : ACTION.NONE;
  c.dollyToCursor = mode === "free";
}

/**
 * Isometric-style perspective camera (TRD §7): orbit/pan/zoom with clamped angles and
 * distance, eased transitions to destinations, and smooth character following.
 */
export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null);
  const mode = useRef<RigMode>("intro");
  const follow = useRef(new THREE.Vector3());
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  // Initial framing and limits.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.smoothTime = cameraConfig.smoothTime;
    c.draggingSmoothTime = 0.12;
    c.minDistance = cameraConfig.minDistance;
    c.maxDistance = cameraConfig.maxDistance;
    c.minPolarAngle = cameraConfig.minPolarDeg * DEG;
    c.maxPolarAngle = cameraConfig.maxPolarDeg * DEG;
    c.azimuthRotateSpeed = 0.6;
    c.polarRotateSpeed = 0.5;
    c.truckSpeed = 1.6;
    c.dollySpeed = 0.6;
    c.setBoundary(new THREE.Box3(new THREE.Vector3(...cameraConfig.targetBounds.min), new THREE.Vector3(...cameraConfig.targetBounds.max)));
    c.boundaryEnclosesCamera = false;
    const o = cameraConfig.overview;
    const t = new THREE.Vector3(...o.target);
    const pos = t.clone().add(offset({ ...o, distance: overviewDistance(size.width / size.height) }));
    c.setLookAt(pos.x, pos.y, pos.z, t.x, t.y, t.z, false);
    configureInputs(c, mode.current, true);
    // Initial framing only; later resizes keep the visitor's camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Commands from the UI.
  useEffect(() => {
    const transition = async (fn: (smooth: boolean) => Promise<unknown>, signal = true) => {
      const st = useExperience.getState();
      if (signal) st.dispatch({ type: "TRANSITION_START" });
      const smooth = !prefersReducedMotion();
      await Promise.race([fn(smooth), new Promise((r) => setTimeout(r, 3000))]);
      if (signal) useExperience.getState().dispatch({ type: "TRANSITION_END" });
    };

    const frame = (target: THREE.Vector3, cam: DestinationCamera) => {
      const c = ref.current!;
      const pos = target.clone().add(offset(cam));
      return transition((smooth) => c.setLookAt(pos.x, pos.y, pos.z, target.x, target.y, target.z, smooth));
    };

    const currentAzimuthDeg = () => (ref.current?.azimuthAngle ?? 0) / DEG;

    const execute = (cmd: CameraCommand) => {
      const c = ref.current;
      if (!c || !cmd) return;
      const st = useExperience.getState();
      switch (cmd.kind) {
        case "overview": {
          mode.current = "free";
          configureInputs(c, mode.current, isInputLocked(st));
          const o = cameraConfig.overview;
          const aspect = c.camera instanceof THREE.PerspectiveCamera ? c.camera.aspect : 1.6;
          void frame(new THREE.Vector3(...o.target), { azimuthDeg: o.azimuthDeg, polarDeg: o.polarDeg, distance: overviewDistance(aspect) });
          return;
        }
        case "follow": {
          c.getTarget(tmpTarget);
          follow.current.copy(tmpTarget);
          mode.current = "follow";
          configureInputs(c, mode.current, isInputLocked(st));
          if (c.distance > cameraConfig.overviewThreshold * 0.8 || c.distance < cameraConfig.minDistance + 2) {
            void c.dollyTo(cameraConfig.follow.distance, !prefersReducedMotion());
            void c.rotatePolarTo(cameraConfig.follow.polarDeg * DEG, !prefersReducedMotion());
          }
          return;
        }
        case "destination": {
          const d = getDestination(cmd.destinationId);
          if (!d) return;
          mode.current = "free";
          configureInputs(c, mode.current, isInputLocked(st));
          const y = getWorld().levels[d.level].elevation + 1;
          void frame(new THREE.Vector3(d.position[0], y, d.position[1]), d.camera);
          return;
        }
        case "anchor": {
          const a = getAnchor(cmd.anchorId);
          if (!a) return;
          mode.current = "free";
          configureInputs(c, mode.current, isInputLocked(st));
          const dist = THREE.MathUtils.clamp(c.distance, 14, 26);
          void frame(new THREE.Vector3(a.p[0], a.p[1], a.p[2]), { azimuthDeg: currentAzimuthDeg(), polarDeg: 48, distance: dist });
          return;
        }
        case "room": {
          const room = getWorld().rooms.find((x) => x.id === cmd.roomId);
          if (!room) return;
          mode.current = "free";
          configureInputs(c, mode.current, isInputLocked(st));
          const cx = (room.rect.x0 + room.rect.x1) / 2;
          const cz = (room.rect.z0 + room.rect.z1) / 2;
          const span = Math.max(room.rect.x1 - room.rect.x0, room.rect.z1 - room.rect.z0);
          void frame(new THREE.Vector3(cx, room.y + 0.5, cz), { azimuthDeg: currentAzimuthDeg(), polarDeg: 48, distance: THREE.MathUtils.clamp(span * 1.5, 16, 48) });
          return;
        }
        case "floor": {
          const b = getWorld().buildings.find((x) => x.id === cmd.buildingId);
          if (!b) return;
          mode.current = "free";
          configureInputs(c, mode.current, isInputLocked(st));
          const y = getWorld().levels[cmd.level].elevation + 0.5;
          const cx = (b.rect.x0 + b.rect.x1) / 2;
          const cz = (b.rect.z0 + b.rect.z1) / 2;
          const span = Math.max(b.rect.x1 - b.rect.x0, b.rect.z1 - b.rect.z0);
          void frame(new THREE.Vector3(cx, y, cz), { azimuthDeg: currentAzimuthDeg(), polarDeg: 46, distance: span * 1.55 });
          return;
        }
        case "rotate":
          void c.rotate(cmd.deltaDeg * DEG, 0, !prefersReducedMotion());
          return;
        case "zoom":
          void c.dollyTo(THREE.MathUtils.clamp(c.distance * cmd.factor, cameraConfig.minDistance, cameraConfig.maxDistance), !prefersReducedMotion());
          return;
      }
    };

    let lastNonce = useExperience.getState().cameraCommand?.nonce ?? 0;
    let lastMode = useExperience.getState().mode;
    let lastModal = useExperience.getState().modal;
    return useExperience.subscribe((s) => {
      if (s.cameraCommand && s.cameraCommand.nonce !== lastNonce) {
        lastNonce = s.cameraCommand.nonce;
        execute(s.cameraCommand.cmd);
      }
      if (s.mode !== lastMode || s.modal !== lastModal) {
        lastMode = s.mode;
        lastModal = s.modal;
        const c = ref.current;
        if (!c) return;
        if (mode.current === "intro" && s.mode !== "intro" && s.mode !== "loading") mode.current = "free";
        configureInputs(c, mode.current, isInputLocked(s));
      }
    });
  }, []);

  // Expose a world → screen projection for HTML labels and tests.
  useEffect(() => {
    runtime.project = (x, y, z) => {
      tmpProj.set(x, y, z).project(camera);
      return {
        x: ((tmpProj.x + 1) / 2) * size.width,
        y: ((1 - tmpProj.y) / 2) * size.height,
        visible: tmpProj.z > -1 && tmpProj.z < 1 && Math.abs(tmpProj.x) < 1.05 && Math.abs(tmpProj.y) < 1.05,
      };
    };
    return () => {
      runtime.project = null;
    };
  }, [camera, size]);

  useFrame((_, rawDt) => {
    const c = ref.current;
    if (!c) return;
    const dt = Math.min(rawDt, 0.05);
    const st = useExperience.getState();
    if (mode.current === "intro" && (st.mode === "intro" || st.mode === "loading") && !prefersReducedMotion()) {
      void c.rotate(cameraConfig.introAutoRotateSpeed * dt, 0, false);
    }
    if (mode.current === "follow") {
      const p = runtime.player;
      const k = 1 - Math.exp(-cameraConfig.followLerp * dt);
      follow.current.x += (p.x - follow.current.x) * k;
      follow.current.y += (p.y + 1.1 - follow.current.y) * k;
      follow.current.z += (p.z - follow.current.z) * k;
      void c.moveTo(follow.current.x, follow.current.y, follow.current.z, false);
    }
    c.getTarget(tmpTarget);
    const cam = runtime.camera;
    cam.azimuth = c.azimuthAngle;
    cam.polar = c.polarAngle;
    cam.distance = c.distance;
    cam.targetX = tmpTarget.x;
    cam.targetY = tmpTarget.y;
    cam.targetZ = tmpTarget.z;
    cam.following = mode.current === "follow";
    st.setOverviewScale(c.distance > cameraConfig.overviewThreshold);
  });

  return <CameraControls ref={ref} makeDefault />;
}
