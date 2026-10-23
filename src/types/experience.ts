/**
 * Core data contracts shared by the 3D scene, the HTML interface and the tests.
 * See Corporate_Virtual_Office_TRD_v1.0.md §4.
 */

export type Vec2 = [x: number, z: number];
export type Vec3 = [x: number, y: number, z: number];

/** Walkable navigation layers. Each one has its own collision set and nav grid. */
export type LevelId = "ground" | "hq-1" | "hq-roof" | "mkt-1" | "sales-1";

export type BuildingId = "hq" | "marketing" | "sales";

/**
 * Render/visibility groups. Upper floors can be hidden by the cutaway system so
 * the visitor can see inside a building.
 */
export type VisibilityGroup =
  | "exterior"
  | "hq-0"
  | "hq-1"
  | "hq-roof"
  | "mkt-0"
  | "mkt-1"
  | "sales-0"
  | "sales-1";

export type ExperienceMode =
  | "loading"
  | "intro"
  | "overview"
  | "walking"
  | "cameraTransition"
  | "objectSelected"
  | "panelOpen"
  | "errorFallback";

export type ModalId = "contact" | "company" | "help" | "directory";

export type CompanySectionId = "about" | "services" | "projects" | "team" | "contact";

export type ContactTopic = "general" | "meeting" | "services" | "project" | "careers";

export type InteractionKind = "room" | "person" | "object" | "project" | "service";

export type InteractionAction =
  | { type: "contact"; label: string; topic?: ContactTopic; recipient?: string }
  | { type: "internal"; label: string; section: CompanySectionId }
  | { type: "external"; label: string; href: string }
  | { type: "navigate"; label: string; destinationId: string }
  | { type: "elevator"; label: string; buildingId: BuildingId }
  | { type: "directory"; label: string };

export interface InteractionContent {
  /** Stable ID. Never derived from the visible title. */
  id: string;
  kind: InteractionKind;
  title: string;
  subtitle?: string;
  description: string;
  details?: string[];
  image?: { src: string; alt: string };
  avatar?: { initials: string; color: string };
  /** Destination the visitor can walk to from the info card. */
  destinationId?: string;
  actions?: InteractionAction[];
}

export interface DestinationCamera {
  /** Degrees. 0 = camera south of the target looking north; positive = towards east. */
  azimuthDeg: number;
  /** Degrees from straight down (0) to horizontal (90). */
  polarDeg: number;
  distance: number;
}

export interface Destination {
  id: string;
  label: string;
  description: string;
  level: LevelId;
  /** Where the character stands on arrival (x, z on the level). */
  position: Vec2;
  camera: DestinationCamera;
  /** Optional floating label anchor in world space. */
  labelAnchor?: Vec3;
  /** Show as a floating pin in the overview and on the mini-map. */
  pinned?: boolean;
  /** Text on the floating pin (defaults to `label`). */
  pinLabel?: string;
  interactionId?: string;
}

export type QualityTier = "high" | "low";
export type QualityPreference = "auto" | QualityTier;
