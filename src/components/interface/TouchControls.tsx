"use client";

import { type PointerEvent, useRef } from "react";
import { runtime } from "@/lib/runtime";

const RADIUS = 52;

/**
 * On-screen joystick for touch devices (PRD FR-09). Writes a normalised vector to the
 * shared input state; the character controller treats it like WASD.
 */
export function Joystick() {
  const knob = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (active.current !== e.pointerId || !base.current) return;
    const r = base.current.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    const dead = 0.12;
    const m = Math.min(1, len / RADIUS);
    const k = m < dead ? 0 : (m - dead) / (1 - dead) / Math.max(m, 1e-6);
    runtime.input.joystick.x = (dx / RADIUS) * k;
    runtime.input.joystick.y = (-dy / RADIUS) * k;
  };

  const end = (e: PointerEvent<HTMLDivElement>) => {
    if (active.current !== e.pointerId) return;
    active.current = null;
    runtime.input.joystick.x = 0;
    runtime.input.joystick.y = 0;
    if (knob.current) knob.current.style.transform = "translate(0px, 0px)";
  };

  return (
    <div
      ref={base}
      data-ui
      role="application"
      aria-label="Movement joystick. Drag to walk."
      className="hud pointer-events-auto relative grid h-[136px] w-[136px] touch-none select-none place-items-center rounded-full"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <div className="pointer-events-none absolute inset-4 rounded-full border border-white/15" />
      <div ref={knob} className="pointer-events-none h-14 w-14 rounded-full bg-gradient-to-b from-white to-blue-100 shadow-[0_6px_16px_rgba(0,0,0,0.35)] ring-4 ring-[#2f6bff]/60" />
    </div>
  );
}
