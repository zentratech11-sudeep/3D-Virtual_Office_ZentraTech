import { getInteractionContent } from "@/data/company-content";
import type { BuildingId, InteractionContent, LevelId } from "@/types/experience";
import type { Person, RoomConfig } from "@/types/organization";
import { getPerson, getRoom, roomOf } from "./organization";

/**
 * Anything a visitor can select: a person, a room, or an object content card.
 * Scene anchors, directory rows and panel links all refer to entities by stable ID.
 */
export type Entity =
  | { kind: "person"; id: string; person: Person }
  | { kind: "room"; id: string; room: RoomConfig }
  | { kind: "content"; id: string; content: InteractionContent };

export function resolveEntity(id: string | null | undefined): Entity | undefined {
  if (!id) return undefined;
  const person = getPerson(id);
  if (person) return { kind: "person", id, person };
  const room = getRoom(id);
  if (room) return { kind: "room", id, room };
  const content = getInteractionContent(id);
  if (content) return { kind: "content", id, content };
  return undefined;
}

export function entityTitle(id: string | null | undefined): string | undefined {
  const e = resolveEntity(id);
  if (!e) return undefined;
  return e.kind === "person" ? e.person.name : e.kind === "room" ? e.room.name : e.content.title;
}

/** Building & storey where an entity lives (used to cut the building open when selected from a list). */
export function entityPlace(id: string): { buildingId: BuildingId; level: LevelId } | undefined {
  const e = resolveEntity(id);
  if (!e) return undefined;
  if (e.kind === "room") return { buildingId: e.room.buildingId, level: e.room.level };
  if (e.kind === "person") {
    const room = roomOf(e.person);
    return room ? { buildingId: room.buildingId, level: room.level } : undefined;
  }
  return undefined;
}
