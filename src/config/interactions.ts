import { z } from "zod";
import { destinations, getDestination } from "@/config/destinations";
import { getInteractionContent, interactionContent } from "@/data/company-content";
import { resolveEntity } from "@/lib/entities";
import { isSafeExternalUrl, isSafeHref } from "@/lib/safe-url";
import { validateOrganization } from "./company-schema";
import type { InteractionContent } from "@/types/experience";
import { getWorld } from "@/world/campus";
import type { AnchorDef } from "@/world/types";

/**
 * Interaction registry: links scene anchors (stable IDs placed in the world) to
 * content records, and validates the whole content configuration.
 */

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LEVELS = ["ground", "hq-1", "hq-roof", "mkt-1", "sales-1"] as const;

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("contact"), label: z.string().min(1), topic: z.string().optional(), recipient: z.string().optional() }),
  z.object({ type: z.literal("internal"), label: z.string().min(1), section: z.enum(["about", "services", "projects", "team", "contact"]) }),
  z.object({ type: z.literal("external"), label: z.string().min(1), href: z.string().refine(isSafeExternalUrl, "External links must be https URLs") }),
  z.object({ type: z.literal("navigate"), label: z.string().min(1), destinationId: z.string().min(1) }),
  z.object({ type: z.literal("elevator"), label: z.string().min(1), buildingId: z.enum(["hq", "marketing", "sales"]) }),
  z.object({ type: z.literal("directory"), label: z.string().min(1) }),
]);

export const interactionContentSchema = z.object({
  id: z.string().regex(ID_RE, "IDs must be kebab-case"),
  kind: z.enum(["room", "person", "object", "project", "service"]),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().min(1),
  details: z.array(z.string().min(1)).optional(),
  image: z.object({ src: z.string().refine(isSafeHref, "Unsafe image URL"), alt: z.string().min(1) }).optional(),
  avatar: z.object({ initials: z.string().min(1).max(3), color: z.string().regex(/^#[0-9a-f]{6}$/i) }).optional(),
  destinationId: z.string().optional(),
  actions: z.array(actionSchema).optional(),
});

export const destinationSchema = z.object({
  id: z.string().regex(ID_RE),
  label: z.string().min(1),
  description: z.string().min(1),
  level: z.enum(LEVELS),
  position: z.tuple([z.number(), z.number()]),
  camera: z.object({ azimuthDeg: z.number(), polarDeg: z.number().min(0).max(89), distance: z.number().positive() }),
  labelAnchor: z.tuple([z.number(), z.number(), z.number()]).optional(),
  pinned: z.boolean().optional(),
  pinLabel: z.string().min(1).optional(),
  interactionId: z.string().optional(),
});

export function getAnchors(): AnchorDef[] {
  return getWorld().anchors;
}

export function getAnchor(anchorId: string): AnchorDef | undefined {
  return getWorld().anchors.find((a) => a.id === anchorId);
}

export function getContentForAnchor(anchorId: string): InteractionContent | undefined {
  const anchor = getAnchor(anchorId);
  return anchor ? getInteractionContent(anchor.contentId) : undefined;
}

/** First anchor showing a content record (used to highlight/frame it). */
export function getPrimaryAnchorForContent(contentId: string): AnchorDef | undefined {
  return getWorld().anchors.find((a) => a.contentId === contentId);
}

/** Returns a list of human-readable problems; empty when the configuration is valid. */
export function validateContentConfig(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const c of interactionContent) {
    const r = interactionContentSchema.safeParse(c);
    if (!r.success) problems.push(`content "${c.id}": ${r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    if (seen.has(c.id)) problems.push(`duplicate content id "${c.id}"`);
    seen.add(c.id);
    if (c.destinationId && !getDestination(c.destinationId)) problems.push(`content "${c.id}" references unknown destination "${c.destinationId}"`);
    for (const a of c.actions ?? []) {
      if (a.type === "navigate" && !getDestination(a.destinationId)) problems.push(`content "${c.id}" action references unknown destination "${a.destinationId}"`);
    }
  }
  const destIds = new Set<string>();
  for (const d of destinations) {
    const r = destinationSchema.safeParse(d);
    if (!r.success) problems.push(`destination "${d.id}": ${r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    if (destIds.has(d.id)) problems.push(`duplicate destination id "${d.id}"`);
    destIds.add(d.id);
    if (d.interactionId && !resolveEntity(d.interactionId)) problems.push(`destination "${d.id}" references unknown content "${d.interactionId}"`);
  }
  const anchorIds = new Set<string>();
  for (const a of getWorld().anchors) {
    if (!ID_RE.test(a.id)) problems.push(`anchor id "${a.id}" is not kebab-case`);
    if (anchorIds.has(a.id)) problems.push(`duplicate anchor id "${a.id}"`);
    anchorIds.add(a.id);
    if (!resolveEntity(a.contentId)) problems.push(`anchor "${a.id}" references unknown content "${a.contentId}"`);
  }
  for (const f of getWorld().featured) {
    if (!anchorIds.has(f.anchorId)) problems.push(`featured person "${f.id}" references unknown anchor "${f.anchorId}"`);
  }
  problems.push(...validateOrganization(), ...getWorld().problems);
  return problems;
}

let checked = false;
/** Fails loudly in development, logs in production. */
export function assertContentConfig() {
  if (checked) return;
  checked = true;
  const problems = validateContentConfig();
  if (problems.length === 0) return;
  const message = `Corporate Virtual Office content configuration is invalid:\n- ${problems.join("\n- ")}`;
  if (process.env.NODE_ENV !== "production") throw new Error(message);
  console.error(message);
}
