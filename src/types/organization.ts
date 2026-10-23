import type { FloorMaterial } from "@/world/types";
import type { CharacterLook } from "@/world/types";
import type { BuildingId, ContactTopic, DestinationCamera, LevelId } from "./experience";

/**
 * Company organisation & office-layout data contracts. A different company reuses the
 * engine by supplying its own records of these types (see src/data/organization.ts and
 * src/data/office-layout.ts). Everything is validated in src/config/company-schema.ts.
 */

export type XZ = [x: number, z: number];
/** Room side: n = north wall (z min), s = south (z max), w = west (x min), e = east (x max). */
export type Side = "n" | "s" | "e" | "w";

export interface Department {
  /** Stable ID, `dept-*`. */
  id: string;
  name: string;
  shortName: string;
  /** Team colour used for the cabin accent wall, chips and avatars. */
  color: string;
  /** Person who leads the team (must belong to this department). */
  leadId: string;
  /** Rooms the team occupies; the first one is its main cabin. */
  roomIds: string[];
  summary: string;
  responsibilities: string[];
  projectIds: string[];
  /** Shared team inbox shown on the team card (demo addresses use a reserved domain). */
  email?: string;
}

export type PersonRole = "ceo" | "receptionist" | "lead" | "member";

export interface PersonLocation {
  roomId: string;
  /** Seat index inside the room (seats are created by the room's fixtures, in order). */
  seat: number;
}

export interface Person {
  /** Stable ID, `person-*`. */
  id: string;
  name: string;
  /** Designation shown on cards and in the directory. */
  title: string;
  departmentId: string;
  role: PersonRole;
  location: PersonLocation;
  /** Stand beside the desk instead of sitting. */
  pose?: "sit" | "stand";
  /** Render as an individually animated character (use sparingly: CEO, reception, leads). */
  animated?: boolean;
  bio: string;
  background?: string;
  /** Leadership message / vision (shown for the CEO). */
  message?: string;
  skills: string[];
  responsibilities: string[];
  projectIds: string[];
  /** Work email (demo data uses a reserved `.example` domain). */
  email?: string;
  /** Offer the contact form addressed to this person. */
  contactable?: boolean;
  /** Offer "Request an appointment" (topic: meeting). */
  appointments?: boolean;
  look?: Partial<CharacterLook>;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  summary: string;
  status: "case-study" | "active";
  outcomes?: string[];
  image?: string;
  departmentIds?: string[];
}

export type RoomKind =
  | "reception"
  | "waiting"
  | "ceo-cabin"
  | "workspace"
  | "team-cabin"
  | "meeting"
  | "lounge"
  | "cafe"
  | "gallery"
  | "story"
  | "circulation";

/** Furniture & decor placed by the room builder. Seat-creating fixtures are marked. */
export type Fixture =
  /** 6 seats: two rows of three desks facing each other. */
  | { type: "deskCluster"; at: XZ; ry?: number; desk?: "wood" | "white" }
  /** `count` seats: individual workstations in a row, people facing south. */
  | { type: "workstations"; from: XZ; count: number; spacing?: number }
  /** 1 seat: single desk facing south (team lead). */
  | { type: "leadDesk"; at: XZ }
  /** 2 × per-side seats: long shared worktable (studio). */
  | { type: "worktable"; at: XZ; length: number; ry?: number }
  /** 1 seat (standing host spot): executive desk with chair, monitor and guest chairs. */
  | { type: "execDesk"; at: XZ }
  /** 1 seat (standing host spot): reception desk in front of the logo wall. */
  | { type: "receptionDesk"; at: XZ; width?: number }
  | { type: "conferenceTable"; at: XZ; length: number }
  | { type: "logoWall"; z: number; from: number; to: number }
  /** Two sofas around a coffee table. `visitors` seats guests (clickable "Visitor" card). */
  | { type: "lounge"; at: XZ; ry?: number; fabric?: string; gap?: number; visitors?: number }
  | { type: "huddle"; at: XZ; chairs?: number }
  /** `contentId` makes the plant clickable. */
  | { type: "plant"; at: XZ; variant?: "tall" | "bush"; scale?: number; contentId?: string }
  | { type: "bench"; at: XZ; ry?: number }
  /** Shelves in a row along +X; `facing: "n"` turns them to stand against a south wall. */
  | { type: "bookshelves"; from: XZ; count: number; facing?: "s" | "n" }
  | { type: "cabinets"; from: XZ; count: number }
  | { type: "wallPanel"; side: Side; from: number; to: number; finish?: "accent" | "wood" | "white" }
  | { type: "screen"; side: Side; at: number; w?: number; kind?: "tv" | "chart"; variant?: number }
  | { type: "sign"; side: Side; at: number; text?: string; w?: number }
  | { type: "whiteboard"; side: Side; at: number; w?: number }
  | { type: "moodboard"; side: Side; at: number; w?: number }
  | { type: "art"; side: Side; at: number; w?: number; variant?: number }
  | { type: "rug"; rect: [number, number, number, number]; finish?: FloorMaterial }
  | { type: "pendants"; at: XZ; length: number; count?: number }
  | { type: "totems"; at: XZ; spacing?: number }
  | { type: "timeline"; side: Side; at: number; w: number }
  | { type: "kiosk"; at: XZ }
  | { type: "cafeCounter"; at: XZ; width: number }
  | { type: "directoryBoard"; side: Side; at: number }
  | { type: "stools"; at: XZ; count: number; spacing?: number };

export interface MeetingSession {
  title: string;
  when: string;
  participantIds: string[];
}

export interface RoomConfig {
  /** Stable ID, `room-*`. Also used as the room's navigation destination ID. */
  id: string;
  name: string;
  kind: RoomKind;
  buildingId: BuildingId;
  level: LevelId;
  /** Floor area [x0, z0, x1, z1] in world metres. */
  rect: [number, number, number, number];
  description: string;
  departmentId?: string;
  floor?: FloorMaterial;
  /** Accent colour (defaults to the department colour). */
  accent?: string;
  /** Where the character stands on arrival (inside the room, near the door). */
  entry: XZ;
  camera?: Partial<DestinationCamera>;
  fixtures?: Fixture[];
  /** Meeting rooms. */
  capacity?: number;
  purpose?: string;
  features?: string[];
  sessions?: MeetingSession[];
  booking?: { label: string; topic: ContactTopic; note: string };
  /** Reception: visitor guidance lines. */
  guidance?: string[];
  /** Entity (person/room ID) whose card opens when the visitor walks in and stops. */
  openOnEnter?: string;
  /** Hide from destination lists (corridors). */
  listed?: boolean;
  /** Floating campus pin (overview map). */
  pin?: { label?: string; anchor: [number, number, number] };
}

export type PartitionStyle = "glass" | "frosted" | "solid" | "wood";

export interface PartitionConfig {
  id: string;
  buildingId: BuildingId;
  level: LevelId;
  /** "x": runs along X at z = `at`. "z": runs along Z at x = `at`. */
  axis: "x" | "z";
  at: number;
  from: number;
  to: number;
  style: PartitionStyle;
  /** Side facing visitors; when it faces the camera the upper part drops to sill height. */
  front?: Side;
  doors?: Array<{ center: number; width: number }>;
}

export interface OfficeLayout {
  rooms: RoomConfig[];
  partitions: PartitionConfig[];
}
