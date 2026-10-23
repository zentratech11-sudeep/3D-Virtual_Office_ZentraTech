import { buildingFloors } from "@/config/destinations";
import { officeLayout } from "@/data/office-layout";
import { departments, people, projects } from "@/data/organization";
import type { BuildingId, LevelId } from "@/types/experience";
import type { Department, Person, Project, RoomConfig } from "@/types/organization";

/**
 * Read-only selectors over the organisation and office layout. UI and scene code use
 * these instead of importing the raw arrays, so every list of staff comes from one place.
 */

const personById = new Map(people.map((p) => [p.id, p]));
const deptById = new Map(departments.map((d) => [d.id, d]));
const roomById = new Map(officeLayout.rooms.map((r) => [r.id, r]));
const projectById = new Map(projects.map((p) => [p.id, p]));

export const getPerson = (id: string): Person | undefined => personById.get(id);
export const getDepartment = (id: string): Department | undefined => deptById.get(id);
export const getRoom = (id: string): RoomConfig | undefined => roomById.get(id);
export const getProject = (id: string): Project | undefined => projectById.get(id);

export const allPeople = (): readonly Person[] => people;
export const allDepartments = (): readonly Department[] => departments;
export const allRooms = (): readonly RoomConfig[] => officeLayout.rooms;
export const allProjects = (): readonly Project[] => projects;
export const caseStudies = () => projects.filter((p) => p.status === "case-study");

const byName = (a: Person, b: Person) => a.name.localeCompare(b.name);

/** Team members, lead first. */
export function membersOf(departmentId: string): Person[] {
  const dept = getDepartment(departmentId);
  const list = people.filter((p) => p.departmentId === departmentId).sort(byName);
  if (!dept) return list;
  return [...list.filter((p) => p.id === dept.leadId), ...list.filter((p) => p.id !== dept.leadId)];
}

export const leadOf = (departmentId: string) => {
  const d = getDepartment(departmentId);
  return d ? getPerson(d.leadId) : undefined;
};

export const peopleInRoom = (roomId: string) => people.filter((p) => p.location.roomId === roomId).sort((a, b) => a.location.seat - b.location.seat);

export const departmentOf = (person: Person) => getDepartment(person.departmentId);
export const roomOf = (person: Person) => getRoom(person.location.roomId);
export const projectsOf = (ids: readonly string[]) => ids.map(getProject).filter((p): p is Project => !!p);
export const roomsOfDepartment = (departmentId: string) => (getDepartment(departmentId)?.roomIds ?? []).map(getRoom).filter((r): r is RoomConfig => !!r);

export const ceo = () => people.find((p) => p.role === "ceo");
export const receptionist = () => people.find((p) => p.role === "receptionist");

/** "Headquarters · Level 1" */
export function floorLabel(buildingId: BuildingId, level: LevelId): string {
  const b = buildingFloors.find((x) => x.buildingId === buildingId);
  const f = b?.floors.find((x) => x.level === level);
  return [b?.label, f?.label].filter(Boolean).join(" · ");
}

/** "Engineering Cabin · Headquarters · Level 1" */
export function locationLabel(person: Person): string {
  const room = roomOf(person);
  return room ? `${room.name} · ${floorLabel(room.buildingId, room.level)}` : "";
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Staff directory search: name, designation, team, skills and room (accent-insensitive). */
export function searchDirectory(query: string, departmentId?: string | null): Person[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  return people
    .filter((p) => !departmentId || p.departmentId === departmentId)
    .filter((p) => {
      if (terms.length === 0) return true;
      const dept = getDepartment(p.departmentId);
      const room = getRoom(p.location.roomId);
      const hay = fold([p.name, p.title, dept?.name, dept?.shortName, room?.name, ...p.skills].join(" "));
      return terms.every((t) => hay.includes(t));
    })
    .sort((a, b) => {
      const rank = (p: Person) => (p.role === "ceo" ? 0 : p.role === "receptionist" ? 1 : p.role === "lead" ? 2 : 3);
      return rank(a) - rank(b) || byName(a, b);
    });
}
