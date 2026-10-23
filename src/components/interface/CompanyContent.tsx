"use client";

import { Briefcase, Building2, Mail, MapPin, Phone, Sparkles, Users } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { company, services } from "@/data/company-content";
import { DEMO_NOTICE } from "@/data/organization";
import { allDepartments, caseStudies, floorLabel, leadOf, membersOf, roomsOfDepartment } from "@/lib/organization";
import { Avatar } from "./Avatar";
import type { CompanySectionId, ContactTopic } from "@/types/experience";

const SECTIONS: Array<{ id: CompanySectionId; label: string }> = [
  { id: "about", label: "About" },
  { id: "services", label: "Services" },
  { id: "projects", label: "Projects" },
  { id: "team", label: "Team" },
  { id: "contact", label: "Contact" },
];

interface Props {
  initialSection?: CompanySectionId;
  onContact: (topic: ContactTopic, recipient?: string) => void;
  /** Opens the searchable staff directory (omitted where it isn't available). */
  onDirectory?: () => void;
  /** Rendered as its own page (WebGL fallback) rather than inside a dialog. */
  standalone?: boolean;
}

/**
 * Essential company information as conventional HTML (PRD FR-10): available from the
 * 3D experience at any time and used as the full fallback when 3D is unavailable.
 */
export function CompanyContent({ initialSection = "about", onContact, onDirectory, standalone = false }: Props) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (initialSection === "about") return;
    root.current?.querySelector(`#section-${initialSection}`)?.scrollIntoView({ block: "start" });
  }, [initialSection]);

  const H = standalone ? "h2" : "h3";
  return (
    <div ref={root} className="flex flex-col gap-8">
      <nav aria-label="Company sections" className="sticky top-0 z-10 -mx-1 -mt-1 flex gap-1 overflow-x-auto bg-white/95 p-1 backdrop-blur">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#section-${s.id}`} className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-navy" onClick={(e) => {
            e.preventDefault();
            root.current?.querySelector(`#section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}>
            {s.label}
          </a>
        ))}
      </nav>

      <section id="section-about" aria-labelledby="h-about" className="scroll-mt-14">
        <H id="h-about" className="flex items-center gap-2 text-xl font-bold text-navy">
          <Building2 size={20} aria-hidden /> About {company.name}
        </H>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{company.description}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">Founded</dt>
            <dd className="text-lg font-bold text-navy">{company.founded}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">Team</dt>
            <dd className="text-lg font-bold text-navy">{company.headcount}</dd>
          </div>
          <div className="col-span-2 rounded-xl bg-slate-50 p-3 sm:col-span-1">
            <dt className="text-slate-500">Where</dt>
            <dd className="font-semibold text-navy">{company.locations.join(" · ")}</dd>
          </div>
        </dl>
      </section>

      <section id="section-services" aria-labelledby="h-services" className="scroll-mt-14">
        <H id="h-services" className="flex items-center gap-2 text-xl font-bold text-navy">
          <Sparkles size={20} aria-hidden /> Services
        </H>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <li key={s.id} className="rounded-xl border border-slate-200 p-4">
              <p className="font-bold text-navy">{s.title}</p>
              <p className="mt-1 text-sm text-slate-600">{s.summary}</p>
              <ul className="mt-2 list-inside list-disc text-sm text-slate-500">
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => onContact("services")} className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Start a project
        </button>
      </section>

      <section id="section-projects" aria-labelledby="h-projects" className="scroll-mt-14">
        <H id="h-projects" className="flex items-center gap-2 text-xl font-bold text-navy">
          <Briefcase size={20} aria-hidden /> Selected work
        </H>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {caseStudies().map((p) => (
            <li key={p.id} className="overflow-hidden rounded-xl border border-slate-200">
              {p.image && <Image src={p.image} alt={`${p.title} preview`} width={480} height={280} className="h-auto w-full" unoptimized />}
              <div className="p-3">
                <p className="font-bold text-navy">{p.title}</p>
                <p className="text-xs text-slate-500">{p.client}</p>
                <p className="mt-1 text-sm text-slate-600">{p.summary}</p>
                <ul className="mt-2 flex flex-col gap-1 text-[13px] text-slate-600">
                  {(p.outcomes ?? []).map((o) => (
                    <li key={o} className="before:mr-1.5 before:text-emerald-500 before:content-['✓']">
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="section-team" aria-labelledby="h-team" className="scroll-mt-14">
        <H id="h-team" className="flex items-center gap-2 text-xl font-bold text-navy">
          <Users size={20} aria-hidden /> Meet the team
        </H>
        <p className="mt-1 text-xs font-medium text-amber-700">{DEMO_NOTICE}</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {allDepartments().map((d) => {
            const lead = leadOf(d.id);
            const members = membersOf(d.id).filter((m) => m.id !== d.leadId);
            const room = roomsOfDepartment(d.id)[0];
            return (
              <li key={d.id} className="rounded-xl border border-slate-200 p-3">
                <p className="flex items-center gap-2 font-bold text-navy">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </p>
                {room && <p className="text-xs text-slate-500">{room.name} · {floorLabel(room.buildingId, room.level)}</p>}
                {lead && (
                  <div className="mt-2 flex items-center gap-2.5">
                    <Avatar person={lead} size={40} ring={false} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.title}</p>
                    </div>
                  </div>
                )}
                {members.length > 0 && (
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                    {members.map((m) => `${m.name} (${m.title})`).join(" · ")}
                  </p>
                )}
                {lead?.contactable && (
                  <button type="button" onClick={() => onContact("general", lead.name)} className="mt-2 text-sm font-semibold text-brand hover:underline">
                    Contact {lead.name.split(" ")[0]}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {onDirectory && (
          <button type="button" onClick={onDirectory} className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Open staff directory
          </button>
        )}
      </section>

      <section id="section-contact" aria-labelledby="h-contact" className="scroll-mt-14 pb-2">
        <H id="h-contact" className="flex items-center gap-2 text-xl font-bold text-navy">
          <Mail size={20} aria-hidden /> Contact & visits
        </H>
        <ul className="mt-3 flex flex-col gap-2 text-[15px] text-slate-600">
          <li className="flex items-center gap-2">
            <MapPin size={16} aria-hidden /> {company.address}
          </li>
          <li className="flex items-center gap-2">
            <Mail size={16} aria-hidden />
            <a className="font-semibold text-brand hover:underline" href={`mailto:${company.email}`}>
              {company.email}
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Phone size={16} aria-hidden />
            <a className="font-semibold text-brand hover:underline" href={`tel:${company.phone.replace(/\s/g, "")}`}>
              {company.phone}
            </a>
          </li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => onContact("general")} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Send an enquiry
          </button>
          <button type="button" onClick={() => onContact("meeting")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Book a meeting
          </button>
        </div>
      </section>
    </div>
  );
}
