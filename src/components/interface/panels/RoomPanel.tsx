"use client";

import {
  Armchair,
  Building2,
  CalendarClock,
  Clock,
  Coffee,
  ConciergeBell,
  Crown,
  Flag,
  Image as ImageIcon,
  type LucideIcon,
  Mail,
  MapPin,
  Monitor,
  Phone,
  Presentation,
  Quote,
  Search,
  Sofa,
  Users,
} from "lucide-react";
import { createElement, forwardRef } from "react";
import { company, contactSettings } from "@/data/company";
import { openDirectory, showEntity } from "@/lib/actions";
import { ceo, floorLabel, getDepartment, getPerson, getProject, leadOf, membersOf, peopleInRoom, receptionist } from "@/lib/organization";
import { useExperience } from "@/lib/store";
import type { RoomConfig, RoomKind } from "@/types/organization";
import { Avatar } from "../Avatar";
import { Bullets, Chips, DemoBadge, PanelFrame, PersonRow, Section, WalkButton, btnPrimary, btnSecondary } from "./PanelParts";

const ROOM_ICONS: Record<RoomKind, LucideIcon> = {
  reception: ConciergeBell,
  waiting: Armchair,
  "ceo-cabin": Crown,
  workspace: Monitor,
  "team-cabin": Users,
  meeting: Presentation,
  lounge: Sofa,
  cafe: Coffee,
  gallery: ImageIcon,
  story: Flag,
  circulation: MapPin,
};

function RoomIcon({ kind }: { kind: RoomKind }) {
  return createElement(ROOM_ICONS[kind] ?? Building2, { size: 20, "aria-hidden": true });
}

function TeamBlock({ room }: { room: RoomConfig }) {
  const openModal = useExperience((s) => s.openModal);
  const dept = room.departmentId ? getDepartment(room.departmentId) : undefined;
  if (!dept) return null;
  const lead = leadOf(dept.id);
  // Open workspaces host several teams: list who sits here. Team cabins list the whole team.
  const seated = peopleInRoom(room.id);
  const members = room.kind === "workspace" ? seated : membersOf(dept.id);
  const projects = dept.projectIds.map(getProject).filter((p) => !!p);
  return (
    <>
      {lead && (
        <Section title="Team lead">
          <ul>
            <PersonRow person={lead} />
          </ul>
        </Section>
      )}
      <Section title={room.kind === "workspace" ? `Working here (${members.length})` : `Team members (${members.length})`}>
        <ul className="-mx-1 flex max-h-56 flex-col overflow-y-auto">
          {members
            .filter((m) => m.id !== lead?.id)
            .map((m) => (
              <PersonRow key={m.id} person={m} note={m.location.roomId !== room.id ? "elsewhere" : undefined} />
            ))}
        </ul>
      </Section>
      <Section title="Responsibilities">
        <Bullets items={dept.responsibilities} />
      </Section>
      {projects.length > 0 && (
        <Section title="Active projects">
          <Chips items={projects.map((p) => p.title)} />
        </Section>
      )}
      <Section title="Contact">
        {dept.email && (
          <p className="mb-2 flex items-center gap-1.5 text-[13px]">
            <Mail size={14} className="text-slate-400" aria-hidden />
            <a className="font-semibold text-brand hover:underline" href={`mailto:${dept.email}`}>
              {dept.email}
            </a>
          </p>
        )}
        <button type="button" className={btnPrimary} onClick={() => openModal("contact", { topic: "services", recipient: dept.name })}>
          Contact the team <Mail size={15} aria-hidden />
        </button>
      </Section>
    </>
  );
}

function ReceptionBlock({ room }: { room: RoomConfig }) {
  const openModal = useExperience((s) => s.openModal);
  const host = receptionist();
  return (
    <>
      {host && (
        <Section title="Your host">
          <ul>
            <PersonRow person={host} />
          </ul>
        </Section>
      )}
      <Section title={`About ${company.name}`}>
        <p className="text-[13px] leading-relaxed text-slate-600">{company.description}</p>
      </Section>
      {room.guidance && (
        <Section title="Visitor guidance">
          <Bullets items={room.guidance} />
        </Section>
      )}
      <Section title="Contact & opening hours">
        <ul className="flex flex-col gap-1 text-[13px] text-slate-600">
          <li className="flex items-center gap-1.5">
            <MapPin size={14} className="text-slate-400" aria-hidden /> {company.address}
          </li>
          <li className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" aria-hidden /> {company.hours}
          </li>
          <li className="flex items-center gap-1.5">
            <Phone size={14} className="text-slate-400" aria-hidden />
            <a className="font-semibold text-brand hover:underline" href={`tel:${company.phone.replace(/\s/g, "")}`}>
              {company.phone}
            </a>
          </li>
          <li className="flex items-center gap-1.5">
            <Mail size={14} className="text-slate-400" aria-hidden />
            <a className="font-semibold text-brand hover:underline" href={`mailto:${contactSettings.recipientEmail}`}>
              {contactSettings.recipientEmail}
            </a>
          </li>
        </ul>
      </Section>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={openDirectory}>
          <Search size={15} aria-hidden /> Staff directory
        </button>
        <button type="button" className={btnSecondary} onClick={() => openModal("contact", { topic: "meeting", recipient: "Reception" })}>
          Plan a visit <CalendarClock size={15} aria-hidden />
        </button>
      </div>
    </>
  );
}

function CeoBlock() {
  const boss = ceo();
  const openModal = useExperience((s) => s.openModal);
  if (!boss) return null;
  return (
    <>
      <Section title="Office of">
        <button
          type="button"
          onClick={() => showEntity(boss.id, { fromPanel: true })}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-2.5 text-left hover:bg-slate-50"
        >
          <Avatar person={boss} size={48} ring={false} />
          <span className="min-w-0">
            <span className="block font-bold text-navy">{boss.name}</span>
            <span className="block text-xs text-slate-500">{boss.title}</span>
            <span className="mt-0.5 block text-xs font-semibold text-brand">View full profile →</span>
          </span>
        </button>
      </Section>
      {boss.message && (
        <Section title="Leadership message">
          <blockquote className="rounded-xl border-l-4 border-[#8a5a3c] bg-slate-50 px-3 py-2.5 text-[13.5px] italic leading-relaxed text-slate-700">
            <Quote size={14} className="mb-1 text-slate-400" aria-hidden />
            {boss.message}
          </blockquote>
        </Section>
      )}
      {boss.appointments && (
        <div className="mt-4">
          <button type="button" className={btnPrimary} onClick={() => openModal("contact", { topic: "meeting", recipient: boss.name })}>
            Request an appointment <CalendarClock size={15} aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}

function MeetingBlock({ room }: { room: RoomConfig }) {
  const openModal = useExperience((s) => s.openModal);
  return (
    <>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {room.capacity && (
          <div className="rounded-xl bg-slate-50 p-2.5">
            <dt className="text-xs text-slate-500">Capacity</dt>
            <dd className="font-bold text-navy">{room.capacity} people</dd>
          </div>
        )}
        {room.purpose && (
          <div className="col-span-2 rounded-xl bg-slate-50 p-2.5 sm:col-span-1">
            <dt className="text-xs text-slate-500">Best for</dt>
            <dd className="text-[13px] font-semibold text-navy">{room.purpose}</dd>
          </div>
        )}
      </dl>
      {room.sessions && room.sessions.length > 0 && (
        <Section title="Regular sessions (sample)">
          <ul className="flex flex-col gap-2">
            {room.sessions.map((s) => (
              <li key={s.title} className="rounded-xl border border-slate-200 p-2.5">
                <p className="text-[13px] font-semibold text-navy">{s.title}</p>
                <p className="text-xs text-slate-500">{s.when}</p>
                <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Participants">
                  {s.participantIds.map((pid) => {
                    const p = getPerson(pid);
                    return p ? (
                      <li key={pid}>
                        <button type="button" onClick={() => showEntity(pid, { fromPanel: true })} className="flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2 text-xs font-semibold text-slate-600 hover:bg-slate-200">
                          <Avatar person={p} size={20} ring={false} />
                          {p.name.split(" ")[0]}
                        </button>
                      </li>
                    ) : null;
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {room.booking && (
        <div className="mt-4">
          <button type="button" className={btnPrimary} onClick={() => openModal("contact", { topic: room.booking!.topic, recipient: room.name })}>
            {room.booking.label} <CalendarClock size={15} aria-hidden />
          </button>
          <p className="mt-2 text-xs text-slate-500">{room.booking.note}</p>
        </div>
      )}
    </>
  );
}

/** Room card: team cabins, reception, CEO cabin, meeting rooms and shared spaces. */
export const RoomPanel = forwardRef<HTMLHeadingElement, { room: RoomConfig }>(function RoomPanel({ room }, ref) {
  const playerLevel = useExperience((s) => s.location.level);
  const zone = useExperience((s) => s.location.zoneLabel);
  const dept = room.departmentId ? getDepartment(room.departmentId) : undefined;
  const accent = room.accent ?? dept?.color ?? "#2f6bff";
  const here = zone === room.name;
  const showTeam = room.kind === "team-cabin" || room.kind === "workspace";
  return (
    <PanelFrame
      ref={ref}
      accent={accent}
      media={
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: accent }}>
          <RoomIcon kind={room.kind} />
        </span>
      }
      title={room.name}
      subtitle={
        <span>
          {floorLabel(room.buildingId, room.level)}
          {dept && room.kind !== "reception" && ` · ${dept.name}`}
        </span>
      }
      badge={showTeam || room.kind === "ceo-cabin" ? <DemoBadge label="Demo team data" /> : undefined}
    >
      <p className="mt-3 text-[14px] leading-relaxed text-slate-600">{room.description}</p>
      {room.features && room.kind !== "meeting" && (
        <Section title="Facilities">
          <Bullets items={room.features} />
        </Section>
      )}
      {room.kind === "meeting" && room.features && (
        <Section title="Facilities">
          <Chips items={room.features} />
        </Section>
      )}
      {room.kind === "reception" && <ReceptionBlock room={room} />}
      {room.kind === "ceo-cabin" && <CeoBlock />}
      {room.kind === "meeting" && <MeetingBlock room={room} />}
      {showTeam && <TeamBlock room={room} />}
      {!here && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <WalkButton id={room.id} label={room.level !== playerLevel ? "Take me there" : "Walk to this room"} />
        </div>
      )}
    </PanelFrame>
  );
});
