"use client";

import { LocateFixed, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import { type MouseEvent, useEffect, useMemo, useRef } from "react";
import { destinations } from "@/config/destinations";
import { recenterOnCharacter } from "@/lib/actions";
import { onRuntimeFrame, runtime } from "@/lib/runtime";
import { useExperience } from "@/lib/store";
import { FOUNTAIN, HQ, LAND, MKT, PARKING, PLAZA, POOL_DECK, POOL_WATER, SALES } from "@/world/constants";
import { getWorld } from "@/world/campus";
import type { Rect } from "@/world/types";

const CENTER = { x: 0, z: -2 };
const RADIUS = 74;
const DEG = 180 / Math.PI;

function R({ r, fill, stroke, sw = 0 }: { r: Rect; fill: string; stroke?: string; sw?: number }) {
  return <rect x={r.x0} y={r.z0} width={r.x1 - r.x0} height={r.z1 - r.z0} fill={fill} stroke={stroke} strokeWidth={sw} />;
}

/**
 * Circular mini-map (design panel 7): rotates with the camera so "up" is the direction
 * you walk with W. Click anywhere to walk there.
 */
export function MiniMap({ compact = false }: { compact?: boolean }) {
  const rotor = useRef<SVGGElement>(null);
  const player = useRef<SVGGElement>(null);
  const north = useRef<SVGGElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const sendNav = useExperience((s) => s.sendNav);
  const sendCamera = useExperience((s) => s.sendCamera);
  const paths = useMemo(() => getWorld().mapPaths, []);
  const pins = useMemo(() => destinations.filter((d) => d.level === "ground" && (d.pinned || !d.id.startsWith("room-"))), []);

  useEffect(() => {
    const update = () => {
      const az = runtime.camera.azimuth * DEG;
      rotor.current?.setAttribute("transform", `rotate(${az.toFixed(2)}) translate(${-CENTER.x} ${-CENTER.z})`);
      const p = runtime.player;
      player.current?.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.z.toFixed(2)}) rotate(${(180 - p.ry * DEG).toFixed(1)})`);
      north.current?.setAttribute("transform", `translate(${CENTER.x} ${CENTER.z - RADIUS * 0.84}) rotate(${(-az).toFixed(2)})`);
    };
    update();
    return onRuntimeFrame(update);
  }, []);

  const onClick = (e: MouseEvent<SVGSVGElement>) => {
    const el = svg.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const scale = box.width / (RADIUS * 2);
    const u = (e.clientX - box.left - box.width / 2) / scale;
    const v = (e.clientY - box.top - box.height / 2) / scale;
    const a = -runtime.camera.azimuth;
    const x = CENTER.x + u * Math.cos(a) - v * Math.sin(a);
    const z = CENTER.z + u * Math.sin(a) + v * Math.cos(a);
    sendNav({ kind: "point", level: "ground", x, z, label: "the spot on the map" });
  };

  const size = compact ? 120 : 172;
  const btn = "hud-button grid h-10 w-10 place-items-center rounded-full";
  return (
    <div data-ui className={`pointer-events-auto flex gap-2 ${compact ? "flex-col items-end" : "items-end"}`}>
      <div className="flex flex-col gap-2" role="group" aria-label="Camera">
        <button type="button" className={btn} onClick={() => sendCamera({ kind: "zoom", factor: 0.72 })} aria-label="Zoom in">
          <Plus size={18} aria-hidden />
        </button>
        <button type="button" className={btn} onClick={() => sendCamera({ kind: "zoom", factor: 1.38 })} aria-label="Zoom out">
          <Minus size={18} aria-hidden />
        </button>
        <button type="button" className={btn} onClick={() => sendCamera({ kind: "rotate", deltaDeg: 45 })} aria-label="Rotate view left">
          <RotateCcw size={17} aria-hidden />
        </button>
        <button type="button" className={btn} onClick={() => sendCamera({ kind: "rotate", deltaDeg: -45 })} aria-label="Rotate view right">
          <RotateCw size={17} aria-hidden />
        </button>
        <button type="button" className={btn} onClick={recenterOnCharacter} aria-label="Center on my character">
          <LocateFixed size={17} aria-hidden />
        </button>
      </div>
      <div className="hud relative rounded-full p-1.5" style={{ width: size + 12, height: size + 12 }}>
        <svg
          ref={svg}
          width={size}
          height={size}
          viewBox={`${-RADIUS} ${-RADIUS} ${RADIUS * 2} ${RADIUS * 2}`}
          className="cursor-crosshair rounded-full"
          onClick={onClick}
          role="img"
          aria-label="Mini-map. Click to walk to a spot on the campus."
        >
          <defs>
            <clipPath id="mm-clip">
              <circle r={RADIUS} />
            </clipPath>
          </defs>
          <g clipPath="url(#mm-clip)">
            <circle r={RADIUS} fill="#1f6fa8" />
            <g ref={rotor}>
              <R r={LAND} fill="#5aa845" />
              {paths.map((p, i) => (
                <R key={i} r={p} fill="#d9d2c4" />
              ))}
              <R r={PLAZA} fill="#e7e1d5" />
              <circle cx={FOUNTAIN.x} cy={FOUNTAIN.z} r={FOUNTAIN.r} fill="#7fd3ef" />
              <R r={PARKING} fill="#5d6168" />
              <R r={POOL_DECK} fill="#e9e4da" />
              <R r={POOL_WATER} fill="#47c6e6" />
              <R r={HQ} fill="#26303c" stroke="#ffffff" sw={1.2} />
              <R r={MKT} fill="#3b4656" stroke="#ffffff" sw={1.2} />
              <R r={SALES} fill="#3b4656" stroke="#ffffff" sw={1.2} />
              {pins.map((d) => (
                <circle key={d.id} cx={d.position[0]} cy={d.position[1]} r={2.4} fill="#ffffff" stroke="#2f6bff" strokeWidth={1.2} />
              ))}
              <g ref={north}>
                <circle r={7} fill="#0b1630" stroke="#8fb2ff" strokeWidth={1.2} />
                <text textAnchor="middle" dominantBaseline="central" fontSize={8.5} fontWeight={800} fill="#ffffff">
                  N
                </text>
              </g>
              <g ref={player}>
                <circle r={6.5} fill="#2f6bff" opacity={0.28} />
                <path d="M0 -6 L4.6 4.6 L0 2.2 L-4.6 4.6 Z" fill="#ffffff" stroke="#2f6bff" strokeWidth={1.6} strokeLinejoin="round" />
              </g>
            </g>
          </g>
          <circle r={RADIUS - 1} fill="none" stroke="#8fb2ff" strokeOpacity={0.55} strokeWidth={2} />
        </svg>
      </div>
    </div>
  );
}
