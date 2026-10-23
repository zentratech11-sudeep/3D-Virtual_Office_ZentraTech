"use client";

import { CalendarClock, Mail, MapPin, Quote } from "lucide-react";
import { forwardRef } from "react";
import { showEntity } from "@/lib/actions";
import { departmentOf, getProject, locationLabel } from "@/lib/organization";
import { useExperience } from "@/lib/store";
import type { Person } from "@/types/organization";
import { Avatar } from "../Avatar";
import { Bullets, Chips, DemoBadge, PanelFrame, Section, WalkButton, btnPrimary, btnSecondary } from "./PanelParts";

/** Employee profile card: identity, team, location, skills, responsibilities, projects, contact. */
export const PersonPanel = forwardRef<HTMLHeadingElement, { person: Person }>(function PersonPanel({ person }, ref) {
  const openModal = useExperience((s) => s.openModal);
  const dept = departmentOf(person);
  const first = person.name.split(" ")[0];
  const projects = person.projectIds.map(getProject).filter((p) => !!p);
  return (
    <PanelFrame
      ref={ref}
      accent={dept?.color}
      media={<Avatar person={person} size={56} />}
      title={person.name}
      subtitle={
        <>
          <span className="block">{person.title}</span>
          {dept && (
            <button
              type="button"
              onClick={() => dept.roomIds[0] && showEntity(dept.roomIds[0], { fromPanel: true })}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-0.5 text-[12px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            >
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: dept.color }} />
              {dept.name}
            </button>
          )}
        </>
      }
      badge={<DemoBadge />}
    >
      <p className="mt-3 flex items-start gap-1.5 text-[13px] text-slate-600">
        <MapPin size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
        <span>{locationLabel(person)}</span>
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{person.bio}</p>

      {person.message && (
        <Section title={person.role === "ceo" ? "Vision & leadership message" : "Message"}>
          <blockquote className="relative rounded-xl border-l-4 bg-slate-50 py-2.5 pl-3 pr-3 text-[13.5px] italic leading-relaxed text-slate-700" style={{ borderColor: dept?.color ?? "#2f6bff" }}>
            <Quote size={14} className="mb-1 text-slate-400" aria-hidden />
            {person.message}
          </blockquote>
        </Section>
      )}
      {person.background && (
        <Section title="Background">
          <p className="text-[13px] leading-relaxed text-slate-600">{person.background}</p>
        </Section>
      )}
      {person.skills.length > 0 && (
        <Section title="Skills">
          <Chips items={person.skills} />
        </Section>
      )}
      {person.responsibilities.length > 0 && (
        <Section title="Responsibilities">
          <Bullets items={person.responsibilities} />
        </Section>
      )}
      {projects.length > 0 && (
        <Section title="Projects">
          <ul className="flex flex-col gap-1">
            {projects.map((p) =>
              p.status === "case-study" ? (
                <li key={p.id}>
                  <button type="button" onClick={() => showEntity(p.id, { fromPanel: true })} className="w-full rounded-lg px-2 py-1 text-left text-[13px] hover:bg-slate-50">
                    <span className="font-semibold text-navy">{p.title}</span> <span className="text-slate-500">· {p.client}</span>
                  </button>
                </li>
              ) : (
                <li key={p.id} className="flex items-center gap-2 px-2 py-1 text-[13px]">
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Active</span>
                  <span className="font-semibold text-navy">{p.title}</span>
                </li>
              ),
            )}
          </ul>
        </Section>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {person.contactable !== false && (
          <button type="button" className={btnPrimary} onClick={() => openModal("contact", { topic: "general", recipient: person.name })}>
            Contact {first} <Mail size={15} aria-hidden />
          </button>
        )}
        {person.appointments && (
          <button type="button" className={btnSecondary} onClick={() => openModal("contact", { topic: "meeting", recipient: person.name })}>
            Request an appointment <CalendarClock size={15} aria-hidden />
          </button>
        )}
        <WalkButton id={person.id} label="Take me there" />
      </div>
    </PanelFrame>
  );
});
