import { officeLayout } from "@/data/office-layout";
import type { BuildingId, Destination, LevelId } from "@/types/experience";

/**
 * Named destinations for the navigation panel, floating map pins and the mini-map.
 * `position` is where the character stands on arrival; `camera` frames the spot.
 * Stable IDs — never derive them from labels.
 */
const DEFAULT_ROOM_CAMERA = { azimuthDeg: -30, polarDeg: 48, distance: 24 };

/** Every listed room is also a destination (ID = room ID), straight from the office layout. */
const roomDestinations: Destination[] = officeLayout.rooms
  .filter((r) => r.listed !== false)
  .map((r) => ({
    id: r.id,
    label: r.name,
    description: r.description,
    level: r.level,
    position: r.entry,
    camera: { ...DEFAULT_ROOM_CAMERA, ...r.camera },
    labelAnchor: r.pin?.anchor,
    pinned: !!r.pin,
    pinLabel: r.pin?.label,
    interactionId: r.id,
  }));

export const destinations: Destination[] = [
  {
    id: "entrance",
    label: "Main Entrance",
    description: "Waterfront gate and the start of the tour.",
    level: "ground",
    position: [4, 34.5],
    camera: { azimuthDeg: -30, polarDeg: 52, distance: 38 },
    labelAnchor: [4, 6.2, 39],
    pinned: true,
  },
  {
    id: "plaza",
    label: "Central Plaza",
    description: "Fountain plaza in front of the headquarters.",
    level: "ground",
    position: [4, 11.4],
    camera: { azimuthDeg: -30, polarDeg: 50, distance: 34 },
    interactionId: "fountain",
  },
  ...roomDestinations,
  {
    id: "pool",
    label: "Wellness Pool",
    description: "Pool deck and recharge area.",
    level: "ground",
    position: [-36.2, -35.5],
    camera: { azimuthDeg: -30, polarDeg: 52, distance: 34 },
    labelAnchor: [-26, 5, -35.5],
    pinned: true,
    interactionId: "wellness-pool",
  },
];

export const ENTRANCE_DESTINATION_ID = "entrance";

const byId = new Map(destinations.map((d) => [d.id, d]));

export function getDestination(id: string): Destination | undefined {
  return byId.get(id);
}

/** Floors shown in the "Floors" menu and the elevator/stairs panels. */
export const buildingFloors: Array<{ buildingId: BuildingId; label: string; floors: Array<{ level: LevelId; label: string; rooms: string }> }> = [
  {
    buildingId: "hq",
    label: "Headquarters",
    floors: [
      { level: "ground", label: "Ground floor", rooms: "Reception · HR & Finance · Projects · Café" },
      { level: "hq-1", label: "Level 1", rooms: "CEO cabin · Engineering · Workspace · Conference" },
      { level: "hq-roof", label: "Rooftop", rooms: "Rooftop lounge · Solar roof" },
    ],
  },
  {
    buildingId: "marketing",
    label: "Marketing pavilion",
    floors: [
      { level: "ground", label: "Ground floor", rooms: "Marketing team" },
      { level: "mkt-1", label: "Upper floor", rooms: "UI/UX design studio" },
    ],
  },
  {
    buildingId: "sales",
    label: "Sales pavilion",
    floors: [
      { level: "ground", label: "Ground floor", rooms: "Sales & BD · Client lounge" },
      { level: "sales-1", label: "Upper floor", rooms: "Partnerships & client success" },
    ],
  },
];
