import type { BuildingId, LevelId, Vec2, Vec3, VisibilityGroup } from "@/types/experience";

/** Axis-aligned rectangle on the XZ plane (min/max corners). */
export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export type Collider =
  | { kind: "rect"; x0: number; z0: number; x1: number; z1: number }
  | { kind: "circle"; x: number; z: number; r: number };

/** Material keys resolved by the scene's material registry. */
export type MaterialKey =
  | "wall"
  | "wallWarm"
  | "frame"
  | "frameLight"
  | "glass"
  | "glassDark"
  | "glassFrost"
  | "woodLight"
  | "woodMid"
  | "woodDark"
  | "woodSlat"
  | "concrete"
  | "metal"
  | "black"
  | "white"
  | "accentGreen"
  | "accentBlue"
  | "fabricGray"
  | "fabricLight"
  | "fabricBlue"
  | "fabricOlive"
  | "roof"
  | "solar"
  | "stone"
  | "pavingDark"
  | "hedge"
  | "leaf"
  | "pot"
  | "potDark"
  | "brandBlue"
  | "glow"
  | "screen"
  | "tint";

/**
 * When a cutaway wall faces the camera its top drops to `cutTop` (absolute Y),
 * like a dollhouse. `nx/nz` is the outward normal.
 */
export interface CutDef {
  nx: number;
  nz: number;
  cutTop: number;
}

export interface BoxDef {
  group: VisibilityGroup;
  /** Center position. */
  p: Vec3;
  /** Full size. */
  s: Vec3;
  ry?: number;
  m: MaterialKey;
  cut?: CutDef;
  /** Per-instance colour (only for material "tint"). */
  color?: string;
}

export type PropType =
  | "desk"
  | "deskChair"
  | "monitor"
  | "deskLamp"
  | "partition"
  | "meetingChair"
  | "sofa"
  | "armchair"
  | "coffeeTable"
  | "plantTall"
  | "plantBush"
  | "plantSmall"
  | "planter"
  | "bookshelf"
  | "tree"
  | "treeRound"
  | "bush"
  | "car"
  | "streetLamp"
  | "bench"
  | "umbrella"
  | "lounger"
  | "solarPanel"
  | "picnicTable"
  | "stool"
  | "railPost"
  | "kioskBase"
  | "pendant"
  | "mug";

export interface PropDef {
  type: PropType;
  group: VisibilityGroup;
  p: Vec3;
  ry: number;
  scale?: number;
  /** Optional tint (cars, fabrics, foliage variation). */
  color?: string;
}

export type FloorMaterial =
  | "grass"
  | "paving"
  | "plaza"
  | "asphalt"
  | "tile"
  | "wood"
  | "woodDark"
  | "deck"
  | "carpet"
  | "carpetBlue"
  | "carpetWarm"
  | "carpetSlate"
  | "poolDeck"
  | "roofDeck";

export interface FloorDef {
  id: string;
  level: LevelId;
  group: VisibilityGroup;
  rect: Rect;
  /** Top surface Y. */
  y: number;
  material: FloorMaterial;
  /** Clicking this surface moves the character (click-to-move). */
  walkable: boolean;
}

export interface LevelDef {
  id: LevelId;
  label: string;
  buildingId?: BuildingId;
  /** Floor surface height. */
  elevation: number;
  group: VisibilityGroup;
  /** Union of walkable rectangles (before obstacles). */
  walkable: Rect[];
}

/** Elevator / stairs connecting levels of the same building. */
export interface LinkDef {
  id: string;
  buildingId: BuildingId;
  kind: "elevator" | "stairs";
  stops: Array<{ level: LevelId; x: number; z: number }>;
}

export interface ZoneDef {
  id: string;
  label: string;
  level: LevelId;
  rect: Rect;
}

export interface AnchorDef {
  /** Unique scene anchor ID. */
  id: string;
  /** Content record this anchor opens. Several anchors may share content. */
  contentId: string;
  level: LevelId;
  group: VisibilityGroup;
  /** Hit-box centre. */
  p: Vec3;
  /** Hit-box size. */
  s: Vec3;
  /** Where the character walks to when visiting this object. */
  approach: Vec2;
}

export type NpcPose = "sit" | "stand";

export interface NpcDef {
  pose: NpcPose;
  group: VisibilityGroup;
  p: Vec3;
  ry: number;
  shirt: string;
  pants: string;
  hair: string;
  skin: string;
}

/** Characters rendered individually (animated, selectable). */
export interface FeaturedPersonDef {
  id: string;
  anchorId: string;
  group: VisibilityGroup;
  p: Vec3;
  ry: number;
  pose: NpcPose;
  look: CharacterLook;
}

export interface CharacterLook {
  shirt: string;
  pants: string;
  hair: string;
  skin: string;
  hairStyle?: "short" | "long" | "bun";
  jacket?: boolean;
  backpack?: boolean;
}

export type SurfaceKind =
  | "monitor"
  | "tv"
  | "chart"
  | "project"
  | "logoWall"
  | "timeline"
  | "moodboard"
  | "whiteboard"
  | "kiosk"
  | "poster"
  | "art"
  | "directory"
  | "sign";

/** A flat textured surface (screens, signage, artwork). Content is drawn on a canvas. */
export interface SurfaceDef {
  id: string;
  kind: SurfaceKind;
  group: VisibilityGroup;
  p: Vec3;
  ry: number;
  w: number;
  h: number;
  /** Text payload / variant for the canvas painter. */
  text?: string;
  variant?: number;
  emissive?: boolean;
}

export type SpecialKind =
  | "fountain"
  | "receptionDesk"
  | "execDesk"
  | "table"
  | "roundTable"
  | "counter"
  | "elevatorDoor"
  | "stairs"
  | "sailboat"
  | "pool"
  | "gate"
  | "skylight"
  | "canopy"
  | "pier";

export interface SpecialDef {
  id: string;
  kind: SpecialKind;
  group: VisibilityGroup;
  p: Vec3;
  ry: number;
  size?: Vec3;
}

export interface WalkerRoute {
  id: string;
  level: LevelId;
  points: Vec2[];
  speed: number;
  look: CharacterLook;
}

export interface CutawayBuilding {
  id: BuildingId;
  /** Footprint used for "inside" and occlusion checks. */
  rect: Rect;
  /** Height of each storey's visible geometry (for occlusion volume). */
  height: number;
  /** Visibility groups from bottom to top. Index = cut level. */
  groups: VisibilityGroup[];
  /** Level id for each storey (same order as groups). */
  levels: LevelId[];
}

/** A workstation (or host spot) created by a room fixture. People are assigned by index. */
export interface SeatDef {
  id: string;
  roomId: string;
  index: number;
  level: LevelId;
  group: VisibilityGroup;
  kind: "desk" | "host";
  /** Seated position & facing (y = floor). */
  sit: [x: number, y: number, z: number, ry: number];
  /** Standing spot beside the desk. */
  stand: [x: number, y: number, z: number, ry: number];
  /** Walkable point next to the seat. */
  approach: Vec2;
  /** Selection volume covering desk and chair. */
  hit: { p: Vec3; s: Vec3 };
  personId?: string;
}

export interface RoomDef {
  id: string;
  buildingId: BuildingId;
  level: LevelId;
  group: VisibilityGroup;
  rect: Rect;
  /** Floor surface height. */
  y: number;
  entry: Vec2;
  /** Doorways into the room (highlighted when the room is selected). */
  doors: Array<{ x: number; z: number; axis: "x" | "z"; width: number }>;
  /** Anchor for the floating room-name label. */
  label: Vec3;
}

export interface WorldData {
  bounds: Rect;
  levels: Record<LevelId, LevelDef>;
  colliders: Record<LevelId, Collider[]>;
  boxes: BoxDef[];
  props: PropDef[];
  floors: FloorDef[];
  links: LinkDef[];
  zones: ZoneDef[];
  anchors: AnchorDef[];
  npcs: NpcDef[];
  featured: FeaturedPersonDef[];
  surfaces: SurfaceDef[];
  specials: SpecialDef[];
  walkers: WalkerRoute[];
  buildings: CutawayBuilding[];
  /** Ground paths for the mini-map. */
  mapPaths: Rect[];
  rooms: RoomDef[];
  seats: SeatDef[];
  /** Layout problems found while building (unknown seats, etc.). Must be empty. */
  problems: string[];
}
