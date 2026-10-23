import { describe, expect, it } from "vitest";
import { seatCount, validateOrganization } from "@/config/company-schema";
import { officeLayout } from "@/data/office-layout";
import { departments, people, projects } from "@/data/organization";
import { entityPlace, entityTitle, resolveEntity } from "@/lib/entities";
import { allDepartments, ceo, leadOf, locationLabel, membersOf, peopleInRoom, receptionist, searchDirectory } from "@/lib/organization";
import type { Department, OfficeLayout, Person, Project } from "@/types/organization";
import { getWorld } from "@/world/campus";

/** A mutable deep copy of the configured data, for breaking on purpose. */
type Draft = { projects: Project[]; departments: Department[]; people: Person[]; layout: OfficeLayout };
const base = (): Draft => structuredClone({ projects, departments, people, layout: officeLayout }) as Draft;

describe("organization data model", () => {
  it("validates the configured company without problems", () => {
    expect(validateOrganization()).toEqual([]);
  });

  it("reports broken cross-references", () => {
    const data = base();
    data.people[1]!.location = { ...data.people[0]!.location };
    data.people[2]!.location = { roomId: "room-nowhere", seat: 0 };
    data.people[3]!.location = { ...data.people[3]!.location, seat: 999 };
    data.departments[0]!.leadId = "person-ghost";
    const problems = validateOrganization(data);
    expect(problems.some((p) => p.includes("share seat"))).toBe(true);
    expect(problems.some((p) => p.includes('unknown room "room-nowhere"'))).toBe(true);
    expect(problems.some((p) => p.includes("seat 999 doesn't exist"))).toBe(true);
    expect(problems.some((p) => p.includes('lead "person-ghost" does not exist'))).toBe(true);
  });

  it("requires exactly one CEO and a receptionist", () => {
    const data = base();
    for (const p of data.people) if (p.role === "ceo" || p.role === "receptionist") p.role = "member";
    const problems = validateOrganization(data);
    expect(problems).toContain('exactly one person must have role "ceo"');
    expect(problems).toContain('at least one person must have role "receptionist"');
  });

  it("rejects duplicate ids, entry points outside a room and doors outside a wall", () => {
    const data = base();
    const rooms = data.layout.rooms;
    rooms[1]!.id = rooms[0]!.id;
    rooms[2]!.entry = [9999, 9999];
    const wall = data.layout.partitions.find((p) => p.doors?.length)!;
    wall.doors![0]!.center = 9999;
    const problems = validateOrganization(data);
    expect(problems.some((p) => p.startsWith("duplicate room id"))).toBe(true);
    expect(problems.some((p) => p.includes("entry point is outside"))).toBe(true);
    expect(problems.some((p) => p.includes("door outside the wall"))).toBe(true);
  });

  it("rejects unsafe or malformed profile fields", () => {
    const data = base();
    data.people[0]!.email = "not an email";
    data.people[1]!.id = "Person With Spaces";
    const problems = validateOrganization(data);
    expect(problems.some((p) => p.includes("email"))).toBe(true);
    expect(problems.some((p) => p.includes('must look like "person-name"'))).toBe(true);
  });

  it("has one CEO, a receptionist and a lead for every department", () => {
    expect(ceo()?.location.roomId).toBe("room-ceo");
    expect(receptionist()?.location.roomId).toBe("room-reception");
    for (const d of allDepartments()) {
      const lead = leadOf(d.id);
      expect(lead, d.id).toBeDefined();
      expect(membersOf(d.id)[0]?.id, d.id).toBe(lead!.id);
    }
  });

  it("derives team membership from people (one source, no duplicates)", () => {
    const listed = allDepartments().flatMap((d) => membersOf(d.id).map((p) => p.id));
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.sort()).toEqual(people.map((p) => p.id).sort());
  });

  it("marks every profile as sample data and exposes no private fields", () => {
    for (const p of people) {
      const keys = Object.keys(p);
      for (const k of ["phone", "address", "salary", "birthday", "personalEmail"]) expect(keys, p.id).not.toContain(k);
      if (p.email) expect(p.email.endsWith(".example"), p.id).toBe(true);
    }
  });
});

describe("staff directory search", () => {
  it("returns everyone for an empty query, CEO first", () => {
    const all = searchDirectory("");
    expect(all).toHaveLength(people.length);
    expect(all[0]?.role).toBe("ceo");
  });

  it("matches name, role, team, skill and room; ignores case and accents", () => {
    expect(searchDirectory("maya")[0]?.id).toBe("person-maya");
    expect(searchDirectory("TOMAS").map((p) => p.name)).toContain("Tomás Silva");
    expect(searchDirectory("design lead").map((p) => p.id)).toContain("person-maya");
    expect(searchDirectory("engineering cabin").every((p) => p.location.roomId === "room-engineering")).toBe(true);
    expect(searchDirectory("no-such-person-xyz")).toEqual([]);
  });

  it("filters by department", () => {
    const eng = searchDirectory("", "dept-engineering");
    expect(eng.length).toBeGreaterThan(0);
    expect(eng.every((p) => p.departmentId === "dept-engineering")).toBe(true);
    expect(eng[0]?.id).toBe("person-arjun-mehta");
  });

  it("labels each person's location by room, building and floor", () => {
    expect(locationLabel(ceo()!)).toBe("CEO Cabin · Headquarters · Level 1");
  });
});

describe("entities", () => {
  it("resolves people, rooms and object cards by id", () => {
    expect(resolveEntity("person-ceo")?.kind).toBe("person");
    expect(resolveEntity("room-conference")?.kind).toBe("room");
    expect(resolveEntity("company")?.kind).toBe("content");
    expect(resolveEntity("nope")).toBeUndefined();
    expect(resolveEntity(null)).toBeUndefined();
    expect(entityTitle("room-conference")).toBe("Conference Room");
  });

  it("knows the building and floor for rooms and people", () => {
    expect(entityPlace("room-conference")).toEqual({ buildingId: "hq", level: "hq-1" });
    expect(entityPlace("person-maya")).toEqual({ buildingId: "marketing", level: "mkt-1" });
    expect(entityPlace("company")).toBeUndefined();
  });
});

describe("office world built from the layout", () => {
  const world = getWorld();

  it("has no build problems", () => {
    expect(world.problems).toEqual([]);
  });

  it("creates every room with its seats and at least one doorway", () => {
    for (const room of officeLayout.rooms) {
      const def = world.rooms.find((r) => r.id === room.id);
      expect(def, room.id).toBeDefined();
      expect(world.seats.filter((s) => s.id.startsWith(`${room.id}#`)).length, room.id).toBe(seatCount(room.fixtures as never));
      // Enclosed rooms (cabins, meeting rooms) must be reachable through a doorway.
      if (room.kind === "ceo-cabin" || room.kind === "meeting" || room.kind === "team-cabin") expect(def!.doors.length, room.id).toBeGreaterThan(0);
    }
  });

  it("seats every person at their configured desk", () => {
    for (const p of people) {
      const seat = world.seats.find((s) => s.personId === p.id);
      expect(seat?.id, p.id).toBe(`${p.location.roomId}#${p.location.seat}`);
    }
    expect(peopleInRoom("room-conference")).toEqual([]);
  });
});
