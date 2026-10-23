"use client";

import type { ReactNode } from "react";
import { useExperience } from "@/lib/store";
import type { VisibilityGroup as Group } from "@/types/experience";
import { isGroupVisible } from "@/world/visibility";

/** Group whose visibility follows the cutaway state (upper floors hide to reveal interiors). */
export function VisibilityGroup({ group, children }: { group: Group; children: ReactNode }) {
  const visible = useExperience((s) => isGroupVisible(group, s.cutLevels));
  return (
    <group visible={visible} userData={{ visibilityGroup: group }}>
      {children}
    </group>
  );
}
