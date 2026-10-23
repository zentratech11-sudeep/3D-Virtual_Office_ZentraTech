"use client";

import { ArrowLeft, ArrowUpRight, ChevronRight, Footprints, Mail, X } from "lucide-react";
import { type ReactNode, forwardRef } from "react";
import { deselect, goBack, goToDestination, openDirectory, showEntity, walkToEntity } from "@/lib/actions";
import { getDepartment, locationLabel } from "@/lib/organization";
import { isSafeExternalUrl } from "@/lib/safe-url";
import { useExperience } from "@/lib/store";
import type { InteractionAction } from "@/types/experience";
import type { Person } from "@/types/organization";
import { Avatar } from "../Avatar";

export const btnPrimary = "inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark";
export const btnSecondary = "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-navy transition-colors hover:bg-slate-50";
export const btnGhost = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100";

/** Card shell: header with icon/avatar, title, Back and Close. Non-modal, keyboard-friendly. */
export const PanelFrame = forwardRef<
  HTMLHeadingElement,
  { media: ReactNode; title: string; subtitle?: ReactNode; badge?: ReactNode; children: ReactNode; accent?: string }
>(function PanelFrame({ media, title, subtitle, badge, children, accent }, headingRef) {
  const canGoBack = useExperience((s) => s.panelStack.length > 0);
  return (
    <div
      data-ui
      data-capture-keys
      role="dialog"
      aria-modal="false"
      aria-labelledby="info-title"
      className="animate-fade-up pointer-events-auto fixed inset-x-3 bottom-3 z-30 max-h-[58dvh] overflow-y-auto rounded-2xl bg-white text-slate-700 shadow-[0_18px_50px_rgba(5,15,40,0.35)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-20 sm:max-h-[calc(100dvh-7rem)] sm:w-[380px]"
    >
      {accent && <div aria-hidden className="h-1.5 w-full rounded-t-2xl" style={{ background: accent }} />}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {canGoBack && (
            <button type="button" onClick={goBack} className="-ml-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Back to previous card">
              <ArrowLeft size={18} aria-hidden />
            </button>
          )}
          {media}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="info-title" ref={headingRef} tabIndex={-1} className="text-[17px] font-bold leading-tight text-navy outline-none">
              {title}
            </h2>
            {subtitle && <div className="mt-0.5 text-[13px] font-medium text-slate-500">{subtitle}</div>}
            {badge}
          </div>
          <button type="button" onClick={deselect} className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close information panel">
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
});

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1 text-[13px] text-slate-600">
      {items.map((d) => (
        <li key={d} className="flex gap-2">
          <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          {d}
        </li>
      ))}
    </ul>
  );
}

export function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <li key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {s}
        </li>
      ))}
    </ul>
  );
}

export function DemoBadge({ label = "Sample profile · demo data" }: { label?: string }) {
  return <p className="mt-1 inline-block rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">{label}</p>;
}

/** Clickable person row (opens their profile; Back returns here). */
export function PersonRow({ person, showLocation = false, note }: { person: Person; showLocation?: boolean; note?: string }) {
  const dept = getDepartment(person.departmentId);
  return (
    <li>
      <button
        type="button"
        onClick={() => showEntity(person.id, { fromPanel: true })}
        className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50 focus-visible:bg-slate-50"
      >
        <Avatar person={person} size={34} ring={false} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-navy">
            {person.name}
            {note && <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-bold uppercase text-slate-500">{note}</span>}
          </span>
          <span className="block truncate text-xs text-slate-500">{showLocation ? locationLabel(person) : `${person.title}${dept ? ` · ${dept.shortName}` : ""}`}</span>
        </span>
        <ChevronRight size={15} className="shrink-0 text-slate-300 group-hover:text-slate-500" aria-hidden />
      </button>
    </li>
  );
}

export function WalkButton({ id, label }: { id: string; label: string }) {
  return (
    <button type="button" onClick={() => walkToEntity(id)} className={btnGhost}>
      <Footprints size={15} aria-hidden /> {label}
    </button>
  );
}

export function ActionButton({ action, primary }: { action: InteractionAction; primary: boolean }) {
  const openModal = useExperience((s) => s.openModal);
  const cls = primary ? btnPrimary : btnSecondary;
  switch (action.type) {
    case "contact":
      return (
        <button type="button" className={cls} onClick={() => openModal("contact", { topic: action.topic, recipient: action.recipient })}>
          {action.label} <Mail size={15} aria-hidden />
        </button>
      );
    case "internal":
      return (
        <button type="button" className={cls} onClick={() => openModal("company", { section: action.section })}>
          {action.label} <ChevronRight size={15} aria-hidden />
        </button>
      );
    case "navigate":
      return (
        <button type="button" className={cls} onClick={() => goToDestination(action.destinationId)}>
          {action.label} <Footprints size={15} aria-hidden />
        </button>
      );
    case "directory":
      return (
        <button type="button" className={cls} onClick={openDirectory}>
          {action.label} <ChevronRight size={15} aria-hidden />
        </button>
      );
    case "external":
      if (!isSafeExternalUrl(action.href)) return null;
      return (
        <a className={cls} href={action.href} target="_blank" rel="noopener noreferrer">
          {action.label} <ArrowUpRight size={15} aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      );
    case "elevator":
      return null;
  }
}
