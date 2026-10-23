"use client";

import { MapPin } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { destinations } from "@/config/destinations";
import { getAnchor } from "@/config/interactions";
import { entityTitle, resolveEntity } from "@/lib/entities";
import { goToDestination, selectContent } from "@/lib/actions";
import { getDepartment, getRoom } from "@/lib/organization";
import { getWorld } from "@/world/campus";
import { isGroupVisible } from "@/world/visibility";
import { runtime } from "@/lib/runtime";
import { useExperience } from "@/lib/store";

/**
 * Floating campus pins (design panel 10) projected from 3D into the HTML layer.
 * They live outside the canvas so clicks never fall through to the scene.
 */
export function ScreenLabels() {
  const overview = useExperience((s) => s.overviewScale);
  const mode = useExperience((s) => s.mode);
  const pins = useMemo(() => destinations.filter((d) => d.pinned && d.labelAnchor), []);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const show = overview && mode !== "loading" && mode !== "intro" && mode !== "errorFallback";

  useEffect(() => {
    if (!show) return;
    let raf = 0;
    const tick = () => {
      pins.forEach((d, i) => {
        const el = refs.current[i];
        const a = d.labelAnchor!;
        const p = runtime.project?.(a[0], a[1], a[2]);
        if (!el) return;
        // Hide pins that would be clipped by the screen edges (small screens).
        const margin = Math.min(70, window.innerWidth * 0.12);
        if (!p || !p.visible || p.x < margin || p.x > window.innerWidth - margin || p.y < 90) {
          el.style.visibility = "hidden";
          return;
        }
        el.style.visibility = "visible";
        el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show, pins]);

  if (!show) return null;
  return (
    <div data-ui className="pointer-events-none absolute inset-0 z-10" aria-label="Campus locations">
      {pins.map((d, i) => (
        <button
          key={d.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          onClick={() => goToDestination(d.id)}
          style={{ visibility: "hidden" }}
          className="hud pointer-events-auto absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-1.5 pr-2.5 text-[12px] font-semibold shadow-lg transition-colors hover:bg-[#1d3c8f] sm:py-1.5 sm:pl-2 sm:pr-3 sm:text-[13px]"
          aria-label={`Go to ${d.pinLabel ?? d.label}`}
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-navy">
            <MapPin size={14} aria-hidden />
          </span>
          {d.pinLabel ?? d.label}
        </button>
      ))}
    </div>
  );
}

/** Name tooltip that follows the mouse while hovering an interactive object. */
export function HoverTooltip() {
  const anchorId = useExperience((s) => s.hoveredAnchorId);
  const selected = useExperience((s) => s.selectedAnchorId);
  const ref = useRef<HTMLDivElement>(null);
  const contentId = anchorId ? (getAnchor(anchorId)?.contentId ?? null) : null;
  const entity = resolveEntity(contentId);
  const title = entityTitle(contentId);
  const subtitle = entity?.kind === "person" ? entity.person.title : entity?.kind === "room" ? "Room · click for details" : "Click for details";

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !ref.current) return;
      ref.current.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 18}px)`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed left-0 top-0 z-40" style={{ visibility: title && anchorId !== selected ? "visible" : "hidden" }}>
      {title && (
        <div className="rounded-lg bg-white px-3 py-2 text-slate-700 shadow-xl ring-1 ring-black/5">
          <p className="text-[13px] font-bold text-navy">{title}</p>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Room-name tags shown when zoomed in. Only rooms on each building's top visible storey
 * are labelled (lower storeys are hidden under the slab), and only near the camera.
 */
export function RoomLabels() {
  const overview = useExperience((s) => s.overviewScale);
  const mode = useExperience((s) => s.mode);
  const cut = useExperience((s) => s.cutLevels);
  const selected = useExperience((s) => s.selectedContentId);
  const show = !overview && mode !== "loading" && mode !== "intro" && mode !== "errorFallback";
  const rooms = useMemo(() => {
    const world = getWorld();
    return world.rooms
      .map((def) => ({ def, config: getRoom(def.id)! }))
      .filter(({ config }) => config && config.listed !== false)
      .filter(({ def }) => {
        const b = world.buildings.find((x) => x.id === def.buildingId);
        return !!b && b.levels.indexOf(def.level) === cut[def.buildingId] && isGroupVisible(def.group, cut);
      });
  }, [cut]);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!show) return;
    let raf = 0;
    const tick = () => {
      const cam = runtime.camera;
      rooms.forEach(({ def }, i) => {
        const el = refs.current[i];
        if (!el) return;
        const [x, y, z] = def.label;
        const near = Math.hypot(x - cam.targetX, z - cam.targetZ) < Math.max(26, cam.distance * 0.9);
        const p = near ? runtime.project?.(x, y, z) : null;
        if (!p || !p.visible || p.x < 40 || p.x > window.innerWidth - 40 || p.y < 80 || p.y > window.innerHeight - 40) {
          el.style.visibility = "hidden";
          return;
        }
        el.style.visibility = "visible";
        el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show, rooms]);

  if (!show) return null;
  return (
    <div data-ui className="pointer-events-none absolute inset-0 z-10" aria-label="Rooms">
      {rooms.map(({ config }, i) => {
        const color = config.accent ?? (config.departmentId ? getDepartment(config.departmentId)?.color : undefined) ?? "#2f6bff";
        const active = selected === config.id;
        return (
          <button
            key={config.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            onClick={() => selectContent(config.id, { focusCamera: true })}
            style={{ visibility: "hidden" }}
            aria-pressed={active}
            className={`pointer-events-auto absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold shadow-md ring-1 transition-colors ${active ? "bg-navy text-white ring-white/30" : "bg-white/95 text-navy ring-black/5 hover:bg-white"}`}
          >
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />
            {config.name}
          </button>
        );
      })}
    </div>
  );
}
