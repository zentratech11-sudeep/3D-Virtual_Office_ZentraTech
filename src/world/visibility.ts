import type { BuildingId, VisibilityGroup } from "@/types/experience";

export type CutLevels = Record<BuildingId, number>;

/**
 * Whether a render group is visible for the current cutaway state.
 * `cut[b]` is the highest visible storey index for building b.
 */
export function isGroupVisible(group: VisibilityGroup, cut: CutLevels): boolean {
  switch (group) {
    case "hq-1":
      return cut.hq >= 1;
    case "hq-roof":
      return cut.hq >= 2;
    case "mkt-1":
      return cut.marketing >= 1;
    case "sales-1":
      return cut.sales >= 1;
    default:
      return true;
  }
}
