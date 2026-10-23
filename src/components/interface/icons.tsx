import {
  ArrowUpDown,
  Briefcase,
  Building2,
  ChartLine,
  Flag,
  Headset,
  type LucideIcon,
  Palette,
  Presentation,
  Sparkles,
  Sprout,
  Sun,
  Target,
  Users,
  Waves,
} from "lucide-react";
import { createElement } from "react";
import type { InteractionContent } from "@/types/experience";

const BY_ID: Record<string, LucideIcon> = {
  company: Building2,
  reception: Building2,
  plant: Sprout,
  "company-story": Flag,
  services: Sparkles,
  elevator: ArrowUpDown,
  "stairs-marketing": ArrowUpDown,
  "stairs-sales": ArrowUpDown,
  "team-workspace": Users,
  "meeting-room": Presentation,
  "executive-office": Briefcase,
  "rooftop-lounge": Sun,
  sustainability: Sun,
  "marketing-team": Target,
  "design-team": Palette,
  "sales-team": ChartLine,
  "customer-success": Headset,
  fountain: Waves,
  "wellness-pool": Waves,
};

const BY_KIND: Record<InteractionContent["kind"], LucideIcon> = {
  room: Building2,
  person: Users,
  object: Sparkles,
  project: Briefcase,
  service: Sparkles,
};

export function iconFor(content: InteractionContent): LucideIcon {
  return BY_ID[content.id] ?? BY_KIND[content.kind];
}

/** Static icon component for a content record (avoids creating components during render). */
export function ContentIcon({ content, size = 20 }: { content: InteractionContent; size?: number }) {
  return createElement(iconFor(content), { size, "aria-hidden": true });
}
