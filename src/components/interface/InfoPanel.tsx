"use client";

import { ChevronRight } from "lucide-react";
import Image from "next/image";
import { forwardRef, useEffect, useRef } from "react";
import { buildingFloors, getDestination } from "@/config/destinations";
import { getAnchor } from "@/config/interactions";
import { travelToLevel } from "@/lib/actions";
import { resolveEntity } from "@/lib/entities";
import { useExperience } from "@/lib/store";
import type { InteractionContent } from "@/types/experience";
import { ContentIcon } from "./icons";
import { PersonPanel } from "./panels/PersonPanel";
import { ActionButton, Bullets, PanelFrame, WalkButton } from "./panels/PanelParts";
import { RoomPanel } from "./panels/RoomPanel";

function FloorPicker({ buildingId }: { buildingId: "hq" | "marketing" | "sales" }) {
  const level = useExperience((s) => s.location.level);
  const b = buildingFloors.find((x) => x.buildingId === buildingId);
  if (!b) return null;
  return (
    <ul className="mt-3 flex flex-col gap-1.5" aria-label={`${b.label} floors`}>
      {[...b.floors].reverse().map((f) => {
        const here = f.level === level;
        return (
          <li key={f.level}>
            <button
              type="button"
              disabled={here}
              onClick={() => travelToLevel(buildingId, f.level)}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-brand hover:bg-blue-50 disabled:cursor-default disabled:border-brand disabled:bg-blue-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-navy">
                  {f.label} {here && <span className="ml-1 rounded bg-brand px-1.5 py-0.5 text-[11px] font-bold text-white">You are here</span>}
                </span>
                <span className="block truncate text-xs text-slate-500">{f.rooms}</span>
              </span>
              {!here && <ChevronRight size={16} className="text-slate-400" aria-hidden />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Card for objects (plants, case studies, kiosk, elevator, fountain…). */
const ContentPanel = forwardRef<HTMLHeadingElement, { content: InteractionContent; anchorId: string | null }>(function ContentPanel({ content, anchorId }, ref) {
  const anchor = anchorId ? getAnchor(anchorId) : undefined;
  const elevator = content.actions?.find((a) => a.type === "elevator");
  const actions = (content.actions ?? []).filter((a) => a.type !== "elevator");
  const dest = content.destinationId ? getDestination(content.destinationId) : undefined;
  const canWalk = !elevator && (anchor || dest);
  return (
    <PanelFrame
      ref={ref}
      media={
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-white">
          <ContentIcon content={content} />
        </span>
      }
      title={content.title}
      subtitle={content.subtitle}
    >
      {content.image && <Image src={content.image.src} alt={content.image.alt} width={480} height={280} className="mt-3 h-auto w-full rounded-xl" unoptimized />}
      <p className="mt-3 text-[14px] leading-relaxed text-slate-600">{content.description}</p>
      {content.details && (
        <div className="mt-2">
          <Bullets items={content.details} />
        </div>
      )}
      {elevator?.type === "elevator" && <FloorPicker buildingId={elevator.buildingId} />}
      {(actions.length > 0 || canWalk) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((a, i) => (
            <ActionButton key={`${a.type}-${a.label}`} action={a} primary={i === 0} />
          ))}
          {canWalk && <WalkButton id={anchor ? content.id : (dest?.id ?? content.id)} label="Walk here" />}
        </div>
      )}
    </PanelFrame>
  );
});

/**
 * Contextual information card for the selected room, person or object (PRD FR-06).
 * Non-modal: the visitor can keep exploring; Back, Close and Escape are always available.
 */
export function InfoPanel() {
  const contentId = useExperience((s) => s.selectedContentId);
  const anchorId = useExperience((s) => s.selectedAnchorId);
  const entity = resolveEntity(contentId);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus into the card when it was opened from the HTML interface (keyboard users).
  useEffect(() => {
    if (!contentId) return;
    const active = document.activeElement;
    const panel = headingRef.current?.closest("[role=dialog]");
    if (active && active !== document.body && (active.closest("[data-ui]") || active.closest("[role=dialog]"))) {
      if (!panel?.contains(active) || active.closest("button")) headingRef.current?.focus();
    }
  }, [contentId]);

  if (!entity) return null;
  if (entity.kind === "person") return <PersonPanel ref={headingRef} person={entity.person} />;
  if (entity.kind === "room") return <RoomPanel ref={headingRef} room={entity.room} />;
  return <ContentPanel ref={headingRef} content={entity.content} anchorId={anchorId} />;
}
