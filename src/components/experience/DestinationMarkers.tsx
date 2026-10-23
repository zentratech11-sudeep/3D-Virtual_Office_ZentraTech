"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getAnchor } from "@/config/interactions";
import { useExperience } from "@/lib/store";
import { getDepartment, getRoom } from "@/lib/organization";
import { getWorld } from "@/world/campus";
import type { AnchorDef } from "@/world/types";

const ringGeo = new THREE.RingGeometry(0.88, 1, 56);
const markerGeo = new THREE.OctahedronGeometry(0.32, 0);

/** Ring height: bottom of the hit-box, never below its level's floor. */
function anchorFloorY(a: AnchorDef) {
  return Math.max(getWorld().levels[a.level].elevation, a.p[1] - a.s[1] / 2) + 0.06;
}

/** Pulsing floor ring + floating diamond above the selected object (shape + motion, not colour alone). */
function SelectionMarker() {
  const anchorId = useExperience((s) => s.selectedAnchorId);
  const anchor = anchorId ? getAnchor(anchorId) : undefined;
  const ring = useRef<THREE.Mesh>(null);
  const marker = useRef<THREE.Mesh>(null);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#2f6bff", transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }), []);
  const markerMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", depthTest: false, toneMapped: false }), []);
  const markerEdge = useMemo(() => new THREE.MeshBasicMaterial({ color: "#2f6bff", depthTest: false, wireframe: true, toneMapped: false }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring.current) {
      const s = 1 + Math.sin(t * 4) * 0.06;
      ring.current.scale.set(s, s, s);
    }
    if (marker.current) {
      marker.current.rotation.y = t * 1.6;
      marker.current.position.y = Math.sin(t * 3) * 0.12;
    }
  });
  if (!anchor) return null;
  const radius = Math.min(3.2, Math.max(anchor.s[0], anchor.s[2]) / 2 + 0.35);
  const top = anchor.p[1] + anchor.s[1] / 2 + 0.7;
  return (
    <group>
      <group position={[anchor.p[0], anchorFloorY(anchor), anchor.p[2]]} scale={radius}>
        <mesh ref={ring} geometry={ringGeo} material={ringMat} rotation-x={-Math.PI / 2} renderOrder={5} />
      </group>
      <group position={[anchor.p[0], top, anchor.p[2]]}>
        <mesh ref={marker} geometry={markerGeo} material={markerMat} renderOrder={1001}>
          <mesh geometry={markerGeo} material={markerEdge} scale={1.05} renderOrder={1002} />
        </mesh>
      </group>
    </group>
  );
}

function HoverRing() {
  const anchorId = useExperience((s) => s.hoveredAnchorId);
  const selected = useExperience((s) => s.selectedAnchorId);
  const anchor = anchorId && anchorId !== selected ? getAnchor(anchorId) : undefined;
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false }), []);
  if (!anchor) return null;
  const radius = Math.max(anchor.s[0], anchor.s[2]) / 2 + 0.3;
  return <mesh geometry={ringGeo} material={mat} position={[anchor.p[0], anchorFloorY(anchor) - 0.01, anchor.p[2]]} rotation-x={-Math.PI / 2} scale={radius} renderOrder={4} />;
}

/** Expanding ring where a click-to-move target was accepted (blue) or rejected (red). */
function ClickCue() {
  const cue = useExperience((s) => s.clickCue);
  const mesh = useRef<THREE.Mesh>(null);
  const start = useRef(0);
  const last = useRef(0);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#2f6bff", transparent: true, depthWrite: false, toneMapped: false }), []);
  useFrame(({ clock }) => {
    if (!mesh.current || !cue) return;
    if (cue.nonce !== last.current) {
      last.current = cue.nonce;
      start.current = clock.elapsedTime;
      mat.color.set(cue.ok ? "#2f6bff" : "#e5484d");
    }
    const t = (clock.elapsedTime - start.current) / 0.9;
    mesh.current.visible = t < 1;
    const s = 0.4 + t * 0.9;
    mesh.current.scale.set(s, s, s);
    mat.opacity = Math.max(0, 1 - t);
  });
  if (!cue) return null;
  return <mesh ref={mesh} geometry={ringGeo} material={mat} position={[cue.p[0], cue.p[1] + 0.08, cue.p[2]]} rotation-x={-Math.PI / 2} renderOrder={6} />;
}

/** Dashed path along the current route and a pin at its end. */
function RouteLine() {
  const route = useExperience((s) => s.route);
  const pin = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (pin.current) pin.current.position.y = (route?.target[1] ?? 0) + 0.9 + Math.sin(clock.elapsedTime * 3) * 0.12;
  });
  if (!route || route.points.length < 2) return null;
  return (
    <group>
      <Line points={route.points} color="#2f6bff" lineWidth={3} dashed dashSize={0.5} gapSize={0.35} transparent opacity={0.9} depthWrite={false} renderOrder={6} />
      <group ref={pin} position={[route.target[0], route.target[1] + 0.9, route.target[2]]}>
        <mesh rotation-x={Math.PI} renderOrder={7}>
          <coneGeometry args={[0.28, 0.6, 16]} />
          <meshBasicMaterial color="#2f6bff" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.42, 0]} renderOrder={7}>
          <sphereGeometry args={[0.26, 16, 12]} />
          <meshBasicMaterial color="#2f6bff" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Highlights the selected (or destination) room: tinted floor, outline and glowing
 * door frames — shape and motion as well as colour.
 */
function RoomHighlight() {
  const selected = useExperience((s) => s.selectedContentId);
  const target = useExperience((s) => (s.nav.state === "moving" ? s.nav.targetId : undefined));
  const roomId = [selected, target].find((id) => id && id.startsWith("room-"));
  const room = roomId ? getWorld().rooms.find((r) => r.id === roomId) : undefined;
  const config = roomId ? getRoom(roomId) : undefined;
  const color = config?.accent ?? (config?.departmentId ? getDepartment(config.departmentId)?.color : undefined) ?? "#2f6bff";
  const fill = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false }), []);
  const edge = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }), []);
  const door = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }), []);
  const doorGroup = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    fill.opacity = 0.14 + Math.sin(t * 2.5) * 0.05;
    if (doorGroup.current) doorGroup.current.position.y = Math.sin(t * 3) * 0.08;
  });
  if (!room) return null;
  fill.color.set(color);
  edge.color.set(color);
  door.color.set(color);
  const { x0, z0, x1, z1 } = room.rect;
  const w = x1 - x0;
  const d = z1 - z0;
  const y = room.y + 0.035;
  const t = 0.12;
  return (
    <group>
      <mesh material={fill} position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation-x={-Math.PI / 2} renderOrder={5}>
        <planeGeometry args={[w, d]} />
      </mesh>
      {[
        [(x0 + x1) / 2, z0 + t / 2, w, t],
        [(x0 + x1) / 2, z1 - t / 2, w, t],
        [x0 + t / 2, (z0 + z1) / 2, t, d],
        [x1 - t / 2, (z0 + z1) / 2, t, d],
      ].map(([cx, cz, sx, sz], i) => (
        <mesh key={i} material={edge} position={[cx, y + 0.005, cz]} rotation-x={-Math.PI / 2} renderOrder={6}>
          <planeGeometry args={[sx, sz]} />
        </mesh>
      ))}
      <group ref={doorGroup}>
        {room.doors.map((dr, i) => (
          <group key={i} position={[dr.x, room.y, dr.z]} rotation-y={dr.axis === "x" ? 0 : Math.PI / 2}>
            {[-1, 1].map((s) => (
              <mesh key={s} material={door} position={[(s * Math.min(dr.width, 3)) / 2, 1.2, 0]} renderOrder={7}>
                <boxGeometry args={[0.08, 2.4, 0.08]} />
              </mesh>
            ))}
            <mesh material={door} position={[0, 2.45, 0]} renderOrder={7}>
              <boxGeometry args={[Math.min(dr.width, 3) + 0.08, 0.08, 0.08]} />
            </mesh>
            <mesh material={door} position={[0, 0.04, 0]} rotation-x={-Math.PI / 2} renderOrder={7}>
              <planeGeometry args={[Math.min(dr.width, 3), 0.9]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export function DestinationMarkers() {
  return (
    <>
      <RoomHighlight />
      <SelectionMarker />
      <HoverRing />
      <ClickCue />
      <RouteLine />
    </>
  );
}
