import { z } from "zod";
import { officeLayout } from "@/data/office-layout";
import { departments, people, projects } from "@/data/organization";
import { isSafeHref } from "@/lib/safe-url";
import type { Department, OfficeLayout, Person, Project } from "@/types/organization";

/**
 * Validated central data model for a company: departments, people, projects, rooms and
 * partitions. `validateOrganization()` checks shapes and every cross-reference so a new
 * company's data fails loudly in development instead of rendering a broken office.
 */

const id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}-[a-z0-9]+(?:-[a-z0-9]+)*$`), `must look like "${prefix}-name"`);
const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "must be a #rrggbb colour");
const email = z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "must be an email address");
const xz = z.tuple([z.number(), z.number()]);
const LEVELS = ["ground", "hq-1", "hq-roof", "mkt-1", "sales-1"] as const;
const BUILDINGS = ["hq", "marketing", "sales"] as const;
const SIDES = ["n", "s", "e", "w"] as const;
const FINISHES = ["grass", "paving", "plaza", "asphalt", "tile", "wood", "woodDark", "deck", "carpet", "carpetBlue", "carpetWarm", "carpetSlate", "poolDeck", "roofDeck"] as const;

export const projectSchema = z.object({
  id: id("project"),
  title: z.string().min(1),
  client: z.string().min(1),
  summary: z.string().min(1),
  status: z.enum(["case-study", "active"]),
  outcomes: z.array(z.string()).optional(),
  image: z.string().refine(isSafeHref, "unsafe image path").optional(),
  departmentIds: z.array(z.string()).optional(),
});

export const departmentSchema = z.object({
  id: id("dept"),
  name: z.string().min(1),
  shortName: z.string().min(1).max(24),
  color: hex,
  leadId: z.string(),
  roomIds: z.array(z.string()).min(1),
  summary: z.string().min(1),
  responsibilities: z.array(z.string().min(1)),
  projectIds: z.array(z.string()),
  email: email.optional(),
});

export const personSchema = z.object({
  id: id("person"),
  name: z.string().min(2),
  title: z.string().min(2),
  departmentId: z.string(),
  role: z.enum(["ceo", "receptionist", "lead", "member"]),
  location: z.object({ roomId: z.string(), seat: z.number().int().min(0) }),
  pose: z.enum(["sit", "stand"]).optional(),
  animated: z.boolean().optional(),
  bio: z.string().min(1),
  background: z.string().optional(),
  message: z.string().optional(),
  skills: z.array(z.string().min(1)),
  responsibilities: z.array(z.string().min(1)),
  projectIds: z.array(z.string()),
  email: email.optional(),
  contactable: z.boolean().optional(),
  appointments: z.boolean().optional(),
  look: z.record(z.string(), z.unknown()).optional(),
});

const fixtureSchema = z.object({ type: z.string() }).passthrough();

export const roomSchema = z.object({
  id: id("room"),
  name: z.string().min(1),
  kind: z.enum(["reception", "waiting", "ceo-cabin", "workspace", "team-cabin", "meeting", "lounge", "cafe", "gallery", "story", "circulation"]),
  buildingId: z.enum(BUILDINGS),
  level: z.enum(LEVELS),
  rect: z.tuple([z.number(), z.number(), z.number(), z.number()]).refine(([x0, z0, x1, z1]) => x1 > x0 && z1 > z0, "rect must be [x0, z0, x1, z1] with x1 > x0, z1 > z0"),
  description: z.string().min(1),
  departmentId: z.string().optional(),
  floor: z.enum(FINISHES).optional(),
  accent: hex.optional(),
  entry: xz,
  camera: z.object({ azimuthDeg: z.number(), polarDeg: z.number(), distance: z.number() }).partial().optional(),
  fixtures: z.array(fixtureSchema).optional(),
  capacity: z.number().int().positive().optional(),
  purpose: z.string().optional(),
  features: z.array(z.string()).optional(),
  sessions: z.array(z.object({ title: z.string(), when: z.string(), participantIds: z.array(z.string()) })).optional(),
  booking: z.object({ label: z.string(), topic: z.enum(["general", "meeting", "services", "project", "careers"]), note: z.string() }).optional(),
  guidance: z.array(z.string()).optional(),
  openOnEnter: z.string().optional(),
  listed: z.boolean().optional(),
  pin: z.object({ label: z.string().optional(), anchor: z.tuple([z.number(), z.number(), z.number()]) }).optional(),
});

export const partitionSchema = z.object({
  id: z.string().min(1),
  buildingId: z.enum(BUILDINGS),
  level: z.enum(LEVELS),
  axis: z.enum(["x", "z"]),
  at: z.number(),
  from: z.number(),
  to: z.number(),
  style: z.enum(["glass", "frosted", "solid", "wood"]),
  front: z.enum(SIDES).optional(),
  doors: z.array(z.object({ center: z.number(), width: z.number().min(0.9) })).optional(),
});

/** Seats created by a room's fixtures (mirrors the room builder). */
export function seatCount(fixtures: ReadonlyArray<{ type: string; [k: string]: unknown }> = []): number {
  let n = 0;
  for (const f of fixtures) {
    if (f.type === "deskCluster") n += 6;
    else if (f.type === "workstations") n += Number(f.count) || 0;
    else if (f.type === "leadDesk" || f.type === "execDesk" || f.type === "receptionDesk") n += 1;
    else if (f.type === "worktable") n += 2 * Math.max(2, Math.floor(Number(f.length) / 1.2));
  }
  return n;
}

const issues = (label: string, e: z.ZodError) => `${label}: ${e.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`;

export interface OrganizationData {
  projects: readonly Project[];
  departments: readonly Department[];
  people: readonly Person[];
  layout: OfficeLayout;
}

/** Returns human-readable problems (empty when valid). Defaults to the configured company data. */
export function validateOrganization(data: OrganizationData = { projects, departments, people, layout: officeLayout }): string[] {
  const { projects, departments, people, layout: officeLayout } = data;
  const problems: string[] = [];
  const seen = new Set<string>();
  const unique = (kind: string, value: string) => {
    if (seen.has(value)) problems.push(`duplicate ${kind} id "${value}"`);
    seen.add(value);
  };

  const projectIds = new Set(projects.map((p) => p.id));
  const roomMap = new Map(officeLayout.rooms.map((r) => [r.id, r]));
  const deptMap = new Map(departments.map((d) => [d.id, d]));
  const personMap = new Map(people.map((p) => [p.id, p]));

  for (const p of projects) {
    unique("project", p.id);
    const r = projectSchema.safeParse(p);
    if (!r.success) problems.push(issues(`project "${p.id}"`, r.error));
    for (const d of p.departmentIds ?? []) if (!deptMap.has(d)) problems.push(`project "${p.id}" references unknown department "${d}"`);
  }

  for (const d of departments) {
    unique("department", d.id);
    const r = departmentSchema.safeParse(d);
    if (!r.success) problems.push(issues(`department "${d.id}"`, r.error));
    const lead = personMap.get(d.leadId);
    if (!lead) problems.push(`department "${d.id}" lead "${d.leadId}" does not exist`);
    else if (lead.departmentId !== d.id) problems.push(`department "${d.id}" lead "${d.leadId}" belongs to "${lead.departmentId}"`);
    for (const rid of d.roomIds) if (!roomMap.has(rid)) problems.push(`department "${d.id}" references unknown room "${rid}"`);
    for (const pid of d.projectIds) if (!projectIds.has(pid)) problems.push(`department "${d.id}" references unknown project "${pid}"`);
  }

  const seatsTaken = new Map<string, string>();
  for (const p of people) {
    unique("person", p.id);
    const r = personSchema.safeParse(p);
    if (!r.success) problems.push(issues(`person "${p.id}"`, r.error));
    if (!deptMap.has(p.departmentId)) problems.push(`person "${p.id}" references unknown department "${p.departmentId}"`);
    const room = roomMap.get(p.location.roomId);
    if (!room) problems.push(`person "${p.id}" sits in unknown room "${p.location.roomId}"`);
    else {
      const capacity = seatCount(room.fixtures as never);
      if (p.location.seat >= capacity) problems.push(`person "${p.id}" seat ${p.location.seat} doesn't exist in "${room.id}" (${capacity} seats)`);
      const key = `${room.id}#${p.location.seat}`;
      if (seatsTaken.has(key)) problems.push(`person "${p.id}" and "${seatsTaken.get(key)}" share seat ${key}`);
      seatsTaken.set(key, p.id);
    }
    for (const pid of p.projectIds) if (!projectIds.has(pid)) problems.push(`person "${p.id}" references unknown project "${pid}"`);
  }
  if (people.filter((p) => p.role === "ceo").length !== 1) problems.push("exactly one person must have role \"ceo\"");
  if (!people.some((p) => p.role === "receptionist")) problems.push("at least one person must have role \"receptionist\"");

  for (const room of officeLayout.rooms) {
    unique("room", room.id);
    const r = roomSchema.safeParse(room);
    if (!r.success) problems.push(issues(`room "${room.id}"`, r.error));
    if (room.departmentId && !deptMap.has(room.departmentId)) problems.push(`room "${room.id}" references unknown department "${room.departmentId}"`);
    for (const s of room.sessions ?? []) for (const pid of s.participantIds) if (!personMap.has(pid)) problems.push(`room "${room.id}" session participant "${pid}" does not exist`);
    if (room.openOnEnter && !personMap.has(room.openOnEnter) && !roomMap.has(room.openOnEnter)) problems.push(`room "${room.id}" openOnEnter "${room.openOnEnter}" is not a person or room`);
    const [x0, z0, x1, z1] = room.rect;
    const [ex, ez] = room.entry;
    if (ex < x0 || ex > x1 || ez < z0 || ez > z1) problems.push(`room "${room.id}" entry point is outside its rectangle`);
  }

  for (const p of officeLayout.partitions) {
    unique("partition", p.id);
    const r = partitionSchema.safeParse(p);
    if (!r.success) problems.push(issues(`partition "${p.id}"`, r.error));
    const lo = Math.min(p.from, p.to);
    const hi = Math.max(p.from, p.to);
    for (const d of p.doors ?? []) if (d.center - d.width / 2 < lo || d.center + d.width / 2 > hi) problems.push(`partition "${p.id}" has a door outside the wall`);
  }
  return problems;
}
