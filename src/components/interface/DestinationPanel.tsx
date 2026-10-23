"use client";

import {
  Armchair,
  Briefcase,
  Coffee,
  ConciergeBell,
  Crown,
  DoorOpen,
  Eye,
  Flag,
  Footprints,
  House,
  Layers,
  type LucideIcon,
  Map as MapIcon,
  Monitor,
  Presentation,
  Sofa,
  Users,
  Waves,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { buildingFloors, destinations } from "@/config/destinations";
import { goOverview, goToDestination, returnToEntrance, travelToLevel, viewFloor } from "@/lib/actions";
import { getDepartment, getRoom } from "@/lib/organization";
import type { RoomKind } from "@/types/organization";
import { useExperience } from "@/lib/store";

const DEST_ICONS: Record<string, LucideIcon> = {
  entrance: DoorOpen,
  plaza: Waves,
  pool: Waves,
};
const KIND_ICONS: Record<RoomKind, LucideIcon> = {
  reception: ConciergeBell,
  waiting: Armchair,
  "ceo-cabin": Crown,
  workspace: Monitor,
  "team-cabin": Users,
  meeting: Presentation,
  lounge: Sofa,
  cafe: Coffee,
  gallery: Briefcase,
  story: Flag,
  circulation: MapIcon,
};

/** Destinations grouped by building and floor (rooms come straight from the office layout). */
function groupedDestinations() {
  const groups: Array<{ title: string; items: typeof destinations }> = [];
  const push = (title: string, items: typeof destinations) => items.length && groups.push({ title, items });
  push("Campus", destinations.filter((d) => !d.id.startsWith("room-")));
  for (const b of buildingFloors) {
    for (const f of b.floors) {
      push(
        `${b.label} · ${f.label}`,
        destinations.filter((d) => {
          const room = getRoom(d.id);
          return room && room.buildingId === b.buildingId && room.level === f.level;
        }),
      );
    }
  }
  return groups;
}

function PanelShell({ id, title, icon, children }: { id: string; title: string; icon: ReactNode; children: ReactNode }) {
  const close = useExperience((s) => s.setNavPanel);
  return (
    <section
      id={id}
      data-ui
      data-capture-keys
      aria-label={title}
      className="hud animate-fade-up pointer-events-auto fixed inset-x-3 bottom-3 z-30 !bg-[rgba(10,20,46,0.94)] flex max-h-[60dvh] flex-col overflow-hidden rounded-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-[200px] sm:top-[156px] sm:w-[320px]"
    >
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="text-[#8fb2ff]">{icon}</span>
        <h2 className="flex-1 text-[15px] font-bold">{title}</h2>
        <button type="button" onClick={() => close(null)} className="grid h-8 w-8 place-items-center rounded-full text-blue-100 hover:bg-white/10" aria-label={`Close ${title}`}>
          <X size={17} aria-hidden />
        </button>
      </header>
      <div className="min-h-0 overflow-y-auto p-2">{children}</div>
    </section>
  );
}

export function DestinationPanel() {
  const location = useExperience((s) => s.location);
  const setNavPanel = useExperience((s) => s.setNavPanel);
  const go = (id: string) => {
    goToDestination(id);
    setNavPanel(null);
  };
  return (
    <PanelShell id="map-panel" title="Destinations" icon={<MapIcon size={18} aria-hidden />}>
      <p className="px-2 pb-1 pt-1 text-[13px] text-blue-100/80">
        You are in <strong className="text-white">{location.zoneLabel}</strong>. Choose a room to walk there.
      </p>
      {groupedDestinations().map((g) => (
        <div key={g.title} className="mb-1">
          <h3 className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-200/70">{g.title}</h3>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((d) => {
              const room = getRoom(d.id);
              const Icon = room ? KIND_ICONS[room.kind] : (DEST_ICONS[d.id] ?? MapIcon);
              const color = room?.departmentId ? getDepartment(room.departmentId)?.color : undefined;
              return (
                <li key={d.id}>
                  <button type="button" onClick={() => go(d.id)} className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-white/10 focus-visible:bg-white/10">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#a9c3ff] group-hover:bg-brand group-hover:text-white" style={color ? { boxShadow: `inset 0 -3px 0 ${color}` } : undefined}>
                      <Icon size={16} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{d.label}</span>
                      <span className="block truncate text-xs text-blue-100/70">{d.description}</span>
                    </span>
                    <Footprints size={15} className="text-blue-200/60 group-hover:text-white" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 p-2">
        <button type="button" onClick={() => (goOverview(), setNavPanel(null))} className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15">
          <House size={15} aria-hidden /> Overview
        </button>
        <button type="button" onClick={() => (returnToEntrance(), setNavPanel(null))} className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15">
          <DoorOpen size={15} aria-hidden /> Entrance
        </button>
      </div>
    </PanelShell>
  );
}

export function FloorPanel() {
  const floorView = useExperience((s) => s.floorView);
  const level = useExperience((s) => s.location.level);
  const setFloorView = useExperience((s) => s.setFloorView);
  const sendCamera = useExperience((s) => s.sendCamera);
  return (
    <PanelShell id="floors-panel" title="Floors" icon={<Layers size={18} aria-hidden />}>
      {buildingFloors.map((b) => (
        <div key={b.buildingId} className="mb-2">
          <h3 className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-200/70">{b.label}</h3>
          <ul className="flex flex-col gap-1">
            {[...b.floors].reverse().map((f) => {
              const viewing = floorView?.buildingId === b.buildingId && floorView.level === f.level;
              const here = f.level === level && (f.level !== "ground" || b.buildingId === "hq");
              return (
                <li key={f.level} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${viewing ? "bg-brand/30 ring-1 ring-[#6f9bff]" : "hover:bg-white/5"}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {f.label}
                      {here && f.level !== "ground" && <span className="ml-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold">YOU</span>}
                    </span>
                    <span className="block truncate text-xs text-blue-100/70">{f.rooms}</span>
                  </span>
                  <button type="button" onClick={() => viewFloor(b.buildingId, f.level)} aria-pressed={viewing} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20" aria-label={`View ${b.label} ${f.label}`}>
                    <Eye size={15} aria-hidden />
                  </button>
                  <button type="button" onClick={() => travelToLevel(b.buildingId, f.level)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-brand" aria-label={`Go to ${b.label} ${f.label}`}>
                    <Footprints size={15} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {floorView && (
        <button
          type="button"
          onClick={() => {
            setFloorView(null);
            sendCamera({ kind: "follow" });
          }}
          className="m-2 w-[calc(100%-1rem)] rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
        >
          Show all floors
        </button>
      )}
    </PanelShell>
  );
}
