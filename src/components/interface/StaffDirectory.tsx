"use client";

import { CalendarClock, ChevronDown, Footprints, Mail, MapPin, Search } from "lucide-react";
import { useId, useState } from "react";
import { DEMO_NOTICE } from "@/data/organization";
import { showEntity, walkToEntity } from "@/lib/actions";
import { allDepartments, getDepartment, locationLabel, searchDirectory } from "@/lib/organization";
import { useExperience } from "@/lib/store";
import type { Person } from "@/types/organization";
import { Avatar } from "./Avatar";
import { btnPrimary, btnSecondary } from "./panels/PanelParts";

/** Inline profile used when there is no 3D scene to open a profile card in. */
function InlineProfile({ person }: { person: Person }) {
  const openModal = useExperience((s) => s.openModal);
  const first = person.name.split(" ")[0];
  return (
    <div className="mb-2 ml-[54px] mr-2 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 text-[13px] text-slate-600">
      <p className="leading-relaxed">{person.bio}</p>
      {person.skills.length > 0 && (
        <p>
          <span className="font-semibold text-navy">Skills:</span> {person.skills.join(", ")}
        </p>
      )}
      {person.responsibilities.length > 0 && (
        <p>
          <span className="font-semibold text-navy">Responsibilities:</span> {person.responsibilities.join("; ")}
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
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
      </div>
    </div>
  );
}

/**
 * Reception's searchable staff directory: name, designation, team and cabin location.
 * Selecting someone opens their profile (and reveals their desk); "Take me there" walks.
 * Without the 3D scene (fallback mode) a row expands into an inline profile instead.
 */
export function StaffDirectory({ canNavigate = true }: { canNavigate?: boolean }) {
  const query = useExperience((s) => s.directoryQuery);
  const dept = useExperience((s) => s.directoryDept);
  const setQuery = useExperience((s) => s.setDirectoryQuery);
  const setDept = useExperience((s) => s.setDirectoryDept);
  const closeModal = useExperience((s) => s.closeModal);
  const [expanded, setExpanded] = useState<string | null>(null);
  const searchId = useId();
  const results = searchDirectory(query, dept);
  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${active ? "border-brand bg-brand text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Search staff by name, role, team or skill
        </label>
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id={searchId}
          type="search"
          data-autofocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, role, team or skill"
          className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          autoComplete="off"
        />
      </div>
      <div role="group" aria-label="Filter by team" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <button type="button" className={chip(!dept)} aria-pressed={!dept} onClick={() => setDept(null)}>
          All teams
        </button>
        {allDepartments().map((d) => (
          <button key={d.id} type="button" className={chip(dept === d.id)} aria-pressed={dept === d.id} onClick={() => setDept(dept === d.id ? null : d.id)}>
            {d.shortName}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500" aria-live="polite">
        {results.length} {results.length === 1 ? "person" : "people"} · {DEMO_NOTICE}
      </p>
      <ul className="-mx-2 flex flex-col" aria-label="Staff">
        {results.map((p) => {
          const d = getDepartment(p.departmentId);
          const open = !canNavigate && expanded === p.id;
          return (
            <li key={p.id}>
              <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50">
                <button
                  type="button"
                  onClick={() => (canNavigate ? showEntity(p.id) : setExpanded(open ? null : p.id))}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  aria-label={`${p.name}, ${p.title}, ${d?.name ?? ""}. ${locationLabel(p)}`}
                  aria-expanded={canNavigate ? undefined : open}
                >
                  <Avatar person={p} size={42} ring={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-navy">{p.name}</span>
                    <span className="block truncate text-xs text-slate-600">{p.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11.5px] text-slate-500">
                      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: d?.color }} />
                      <span className="shrink-0">{d?.shortName}</span>
                      <MapPin size={11} className="shrink-0" aria-hidden />
                      <span className="truncate">{locationLabel(p)}</span>
                    </span>
                  </span>
                  {!canNavigate && <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />}
                </button>
                {canNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      closeModal();
                      walkToEntity(p.id);
                    }}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-brand hover:text-white"
                    aria-label={`Take me to ${p.name}`}
                    title="Take me there"
                  >
                    <Footprints size={16} aria-hidden />
                  </button>
                )}
              </div>
              {open && <InlineProfile person={p} />}
            </li>
          );
        })}
        {results.length === 0 && <li className="px-2 py-6 text-center text-sm text-slate-500">No one matches “{query}”. Try a team name or skill.</li>}
      </ul>
    </div>
  );
}
