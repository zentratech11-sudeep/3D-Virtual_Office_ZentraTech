"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getDestination } from "@/config/destinations";
import { getAnchor } from "@/config/interactions";
import { movementConfig } from "@/config/office";
import { entityTitle } from "@/lib/entities";
import { getRoom } from "@/lib/organization";
import { selectContent } from "@/lib/actions";
import { moveWithCollision } from "@/lib/collision";
import { isInputLocked } from "@/lib/experience-machine";
import { type NavPlan, Navigator, pathLength } from "@/lib/navigation";
import { emitRuntimeFrame, runtime } from "@/lib/runtime";
import { type NavCommand, useExperience } from "@/lib/store";
import type { LevelId, Vec3 } from "@/types/experience";
import { getWorld } from "@/world/campus";
import { rectContains } from "@/world/builder";
import type { CharacterLook } from "@/world/types";
import { type CharacterAnim, CharacterModel, createAnim } from "./CharacterModel";

export const PLAYER_LOOK: CharacterLook = {
  shirt: "#2f63c9",
  pants: "#27324a",
  hair: "#2a1d15",
  skin: "#e6b38e",
  hairStyle: "short",
  jacket: true,
  backpack: true,
};

interface RouteState {
  plan: NavPlan;
  leg: number;
  point: number;
  run: boolean;
  label: string;
  /** Content to open on arrival. */
  openContentId?: string;
  openAnchorId?: string;
  lastProgressDist: number;
  stuckTime: number;
}

const MOVE_KEYS = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
};

const pressed = (codes: string[]) => codes.some((c) => runtime.input.keys.has(c));

function elevationOf(level: LevelId) {
  return getWorld().levels[level].elevation;
}

/** Shortest signed angle difference. */
function angleDelta(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function CharacterController() {
  const group = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.Group>(null);
  const anim = useRef<CharacterAnim>(createAnim());
  const navigator = useMemo(() => new Navigator(getWorld(), movementConfig.radius), []);
  const vel = useRef({ x: 0, z: 0 });
  const route = useRef<RouteState | null>(null);
  const fade = useRef<{ t: number; level: LevelId; x: number; z: number } | null>(null);
  const zoneTimer = useRef(0);
  const entered = useRef<{ roomId: string | null; pending: string | null; still: number }>({ roomId: null, pending: null, still: 0 });
  const followRequested = useRef(false);
  const emitTimer = useRef(0);

  const setNav = useExperience((s) => s.setNav);
  const setRoute = useExperience((s) => s.setRoute);
  const routeApi = useRef<{ publishRoute: () => void; finishRoute: (s: "idle" | "failed", m?: string) => void } | null>(null);
  const tmpV = useMemo(() => new THREE.Vector3(), []);

  // Execute navigation commands from the UI / scene.
  useEffect(() => {
    const finishRoute = (state: "idle" | "failed", message?: string) => {
      route.current = null;
      setRoute(null);
      setNav(state === "failed" ? { state: "failed", message } : { state: "idle" });
    };

    const start = (target: { level: LevelId; x: number; z: number }, label: string, extra: Partial<RouteState> = {}) => {
      const p = runtime.player;
      const plan = navigator.plan({ level: p.level, x: p.x, z: p.z }, target);
      const st = useExperience.getState();
      if (!plan) {
        finishRoute("failed", `Can't find a way to ${label}.`);
        st.showClickCue([target.x, elevationOf(target.level), target.z], false);
        return false;
      }
      route.current = {
        plan,
        leg: 0,
        point: 1,
        run: plan.length > movementConfig.autoRunDistance,
        label,
        lastProgressDist: Infinity,
        stuckTime: 0,
        ...extra,
      };
      st.dispatch({ type: "MOVE" });
      st.sendCamera({ kind: "follow" });
      setNav({ state: "moving", label, targetId: extra.openContentId });
      publishRoute();
      const last = plan.legs[plan.legs.length - 1];
      const end = last.points[last.points.length - 1];
      st.showClickCue([end[0], elevationOf(last.level), end[1]], true);
      return true;
    };

    const execute = (cmd: NavCommand) => {
      const st = useExperience.getState();
      switch (cmd.kind) {
        case "cancel":
          finishRoute("idle");
          return;
        case "skip": {
          // Jump straight to the end of the current route (also used for reduced motion).
          const r = route.current;
          if (!r) return;
          const lastLeg = r.plan.legs[r.plan.legs.length - 1];
          const end = lastLeg.points[lastLeg.points.length - 1];
          const p = runtime.player;
          p.level = lastLeg.level;
          p.x = end[0];
          p.z = end[1];
          vel.current.x = 0;
          vel.current.z = 0;
          finishRoute("idle");
          setNav({ state: "arrived", label: r.label });
          if (r.openContentId) selectContent(r.openContentId, { anchorId: r.openAnchorId ?? null, focusCamera: false });
          return;
        }
        case "point": {
          const snapped = navigator.snap(cmd.level, cmd.x, cmd.z, 2.5);
          if (!snapped) {
            st.showClickCue([cmd.x, elevationOf(cmd.level), cmd.z], false);
            setNav({ state: "failed", message: "You can't walk there." });
            return;
          }
          start({ level: cmd.level, x: snapped[0], z: snapped[1] }, cmd.label ?? "the selected spot");
          return;
        }
        case "destination": {
          const d = getDestination(cmd.destinationId);
          if (!d) return;
          start({ level: d.level, x: d.position[0], z: d.position[1] }, d.label, {
            openContentId: d.interactionId,
          });
          return;
        }
        case "anchor": {
          const a = getAnchor(cmd.anchorId);
          if (!a) return;
          start({ level: a.level, x: a.approach[0], z: a.approach[1] }, entityTitle(a.contentId) ?? "there", {
            openContentId: a.contentId,
            openAnchorId: a.id,
          });
          return;
        }
        case "level": {
          const link = getWorld().links.find((l) => l.buildingId === cmd.buildingId);
          const stop = link?.stops.find((s) => s.level === cmd.level);
          if (!stop) return;
          start(stop, getWorld().levels[cmd.level].label);
          return;
        }
        case "teleport": {
          finishRoute("idle");
          const p = runtime.player;
          p.level = cmd.level;
          p.x = cmd.x;
          p.z = cmd.z;
          if (cmd.ry !== undefined) p.ry = cmd.ry;
          vel.current.x = 0;
          vel.current.z = 0;
          return;
        }
      }
    };

    const publishRoute = () => {
      const r = route.current;
      if (!r) return setRoute(null);
      const leg = r.plan.legs[r.leg];
      const y = elevationOf(leg.level) + 0.07;
      const pts: Vec3[] = [[runtime.player.x, y, runtime.player.z], ...leg.points.slice(r.point).map(([x, z]) => [x, y, z] as Vec3)];
      const lastLeg = r.plan.legs[r.plan.legs.length - 1];
      const end = lastLeg.points[lastLeg.points.length - 1];
      setRoute({ points: pts, target: [end[0], elevationOf(lastLeg.level), end[1]] });
    };
    routeApi.current = { publishRoute, finishRoute };

    let lastNonce = useExperience.getState().navCommand?.nonce ?? 0;
    return useExperience.subscribe((s) => {
      if (s.navCommand && s.navCommand.nonce !== lastNonce) {
        lastNonce = s.navCommand.nonce;
        execute(s.navCommand.cmd);
      }
    });
  }, [navigator, setNav, setRoute]);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useExperience.getState();
    const p = runtime.player;
    const locked = isInputLocked(st);

    // Floor change animation (elevator / stairs ride).
    if (fade.current) {
      const f = fade.current;
      f.t += dt;
      const half = 0.28;
      if (f.t >= half && p.level !== f.level) {
        p.level = f.level;
        p.x = f.x;
        p.z = f.z;
      }
      const k = f.t < half ? 1 - f.t / half : Math.min(1, (f.t - half) / half);
      if (group.current) group.current.scale.setScalar(Math.max(0.001, k));
      if (f.t >= half * 2) {
        fade.current = null;
        if (group.current) group.current.scale.setScalar(1);
      }
    }

    // Camera-relative input.
    let ix = 0;
    let iy = 0;
    if (!locked && !fade.current) {
      if (pressed(MOVE_KEYS.forward)) iy += 1;
      if (pressed(MOVE_KEYS.back)) iy -= 1;
      if (pressed(MOVE_KEYS.right)) ix += 1;
      if (pressed(MOVE_KEYS.left)) ix -= 1;
      ix += runtime.input.joystick.x;
      iy += runtime.input.joystick.y;
    }
    let mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
      mag = 1;
    }
    const hasInput = mag > 0.08;
    const running = runtime.input.keys.has("ShiftLeft") || runtime.input.keys.has("ShiftRight");

    if (hasInput) {
      if (route.current) routeApi.current?.finishRoute("idle");
      if (st.mode !== "walking") st.dispatch({ type: "MOVE" });
      if (st.floorView) st.setFloorView(null);
      // Moving always brings the camera back to the character.
      if (!runtime.camera.following && !followRequested.current) {
        followRequested.current = true;
        st.sendCamera({ kind: "follow" });
      }
    } else followRequested.current = false;

    camera.getWorldDirection(tmpV);
    const flen = Math.hypot(tmpV.x, tmpV.z) || 1;
    const fx = tmpV.x / flen;
    const fz = tmpV.z / flen;
    // Right vector = forward × up.
    const rx = -fz;
    const rz = fx;

    let desiredX = 0;
    let desiredZ = 0;
    const r = route.current;
    if (hasInput) {
      const speed = running ? movementConfig.runSpeed : movementConfig.walkSpeed;
      desiredX = (fx * iy + rx * ix) * speed;
      desiredZ = (fz * iy + rz * ix) * speed;
    } else if (r && !fade.current) {
      const leg = r.plan.legs[r.leg];
      const target = leg.points[Math.min(r.point, leg.points.length - 1)];
      const dx = target[0] - p.x;
      const dz = target[1] - p.z;
      const dist = Math.hypot(dx, dz);
      const isLastPoint = r.point >= leg.points.length - 1;
      const isFinal = isLastPoint && r.leg === r.plan.legs.length - 1;
      const reach = isLastPoint ? 0.18 : 0.45;
      if (dist < reach) {
        if (!isLastPoint) {
          r.point++;
          r.lastProgressDist = Infinity;
          routeApi.current?.publishRoute();
        } else if (!isFinal) {
          // Ride the elevator/stairs to the next level.
          const next = r.plan.legs[r.leg + 1];
          r.leg++;
          r.point = 1;
          r.lastProgressDist = Infinity;
          const linkId = r.plan.links[r.leg - 1];
          const link = getWorld().links.find((l) => l.id === linkId);
          const startPt = next.points[0];
          fade.current = { t: 0, level: next.level, x: startPt[0], z: startPt[1] };
          st.announce(`${link?.kind === "stairs" ? "Taking the stairs" : "Taking the elevator"} to ${getWorld().levels[next.level].label}.`);
          vel.current.x = 0;
          vel.current.z = 0;
          window.setTimeout(() => routeApi.current?.publishRoute(), 600);
        } else {
          // Arrived.
          const done = r;
          routeApi.current?.finishRoute("idle");
          setNav({ state: "arrived", label: done.label });
          if (done.openContentId) selectContent(done.openContentId, { anchorId: done.openAnchorId ?? null, focusCamera: false });
        }
      } else {
        const remaining = isFinal ? dist : dist + pathLength(leg.points.slice(r.point));
        const base = r.run ? movementConfig.runSpeed : movementConfig.walkSpeed;
        const speed = isFinal ? base * Math.min(1, Math.max(0.3, remaining / 1.6)) : base;
        desiredX = (dx / dist) * speed;
        desiredZ = (dz / dist) * speed;
        // Stuck detection.
        if (dist < r.lastProgressDist - 0.05) {
          r.lastProgressDist = dist;
          r.stuckTime = 0;
        } else {
          r.stuckTime += dt;
          if (r.stuckTime > movementConfig.stuckTimeout) routeApi.current?.finishRoute("failed", `Couldn't reach ${r.label}.`);
        }
      }
    }

    // Accelerate towards the desired velocity.
    const v = vel.current;
    const ax = desiredX - v.x;
    const az = desiredZ - v.z;
    const amax = movementConfig.acceleration * dt * (hasInput || r ? 1 : 1.6);
    const alen = Math.hypot(ax, az);
    if (alen > amax) {
      v.x += (ax / alen) * amax;
      v.z += (az / alen) * amax;
    } else {
      v.x = desiredX;
      v.z = desiredZ;
    }

    if (!fade.current && (Math.abs(v.x) > 1e-4 || Math.abs(v.z) > 1e-4)) {
      const layer = navigator.layer(p.level);
      const [nx, nz] = moveWithCollision(layer, p.x, p.z, v.x * dt, v.z * dt, movementConfig.radius);
      const actual = Math.hypot(nx - p.x, nz - p.z) / Math.max(dt, 1e-4);
      p.x = nx;
      p.z = nz;
      p.speed = actual;
      if (actual > 0.25) {
        const targetYaw = Math.atan2(v.x, v.z);
        p.ry += angleDelta(p.ry, targetYaw) * Math.min(1, movementConfig.turnSpeed * dt);
      }
    } else p.speed = 0;

    p.y = elevationOf(p.level) + 0.03;
    anim.current.amount += (Math.min(1.25, p.speed / movementConfig.walkSpeed) - anim.current.amount) * Math.min(1, dt * 10);
    anim.current.speed = p.speed;

    if (group.current) {
      group.current.position.set(p.x, p.y, p.z);
      group.current.rotation.y = p.ry;
    }
    if (beacon.current) {
      const d = camera.position.distanceTo(group.current?.position ?? camera.position);
      const s = THREE.MathUtils.clamp(d / 30, 0.6, 5);
      beacon.current.scale.setScalar(s);
      beacon.current.position.y = 2.15 + s * 0.35 + Math.sin(performance.now() / 300) * 0.06 * s;
    }

    // Location label (throttled).
    zoneTimer.current += dt;
    if (zoneTimer.current > 0.25) {
      zoneTimer.current = 0;
      const zone = getWorld().zones.find((z) => z.level === p.level && rectContains(z.rect, p.x, p.z));
      st.setLocation(p.level, zone?.label ?? "Campus grounds");
      // Rooms that open a card when the visitor walks in and pauses (CEO cabin, reception).
      const roomDef = getWorld().rooms.find((rm) => rm.level === p.level && rectContains(rm.rect, p.x, p.z));
      const enter = entered.current;
      if ((roomDef?.id ?? null) !== enter.roomId) {
        enter.roomId = roomDef?.id ?? null;
        enter.pending = roomDef ? (getRoom(roomDef.id)?.openOnEnter ?? null) : null;
        enter.still = 0;
      }
      enter.still = p.speed < 0.2 ? enter.still + 0.25 : 0;
      if (enter.pending && enter.still >= 0.5 && !route.current && !fade.current && !locked) {
        if (!st.selectedContentId) selectContent(enter.pending, { focusCamera: false });
        enter.pending = null;
      }
    }
    emitTimer.current += dt;
    if (emitTimer.current > 1 / 20) {
      emitTimer.current = 0;
      emitRuntimeFrame();
    }
  });

  return (
    <group ref={group} name="player">
      <CharacterModel look={PLAYER_LOOK} anim={anim} />
      <group ref={beacon}>
        <mesh renderOrder={999} rotation-x={Math.PI}>
          <coneGeometry args={[0.22, 0.42, 4]} />
          <meshBasicMaterial color="#2f6bff" depthTest={false} transparent opacity={0.95} />
        </mesh>
        <mesh renderOrder={1000} rotation-x={Math.PI} scale={0.62}>
          <coneGeometry args={[0.22, 0.42, 4]} />
          <meshBasicMaterial color="#ffffff" depthTest={false} transparent opacity={0.9} />
        </mesh>
      </group>
    </group>
  );
}
