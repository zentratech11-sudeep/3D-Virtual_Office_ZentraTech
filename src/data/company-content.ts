import type { InteractionContent } from "@/types/experience";
import { company } from "./company";
import { projects } from "./organization";

/**
 * Company content: services and the information cards for objects in the 3D office
 * (plants, case-study screens, the fountain, elevator…).
 *
 *  - Company identity, brand & contact settings → src/data/company.ts
 *  - Departments, people, projects (DEMO)       → src/data/organization.ts
 *  - Rooms, partitions and furniture (DEMO)      → src/data/office-layout.ts
 *
 * Scene anchors reference records by stable `id`; rooms (`room-*`) and people
 * (`person-*`) are resolved from the organisation model instead of this file.
 */

export { brand, company, contactSettings } from "./company";
export { projects } from "./organization";
export type { Project } from "@/types/organization";

export interface Service {
  id: string;
  title: string;
  summary: string;
  points: string[];
}

export const services: Service[] = [
  {
    id: "service-strategy",
    title: "Product strategy",
    summary: "Discovery, research and roadmaps that connect customer needs to business goals.",
    points: ["Customer & market research", "Opportunity mapping", "Roadmaps and success metrics"],
  },
  {
    id: "service-design",
    title: "Experience design",
    summary: "Accessible, user-centred interfaces and design systems that scale.",
    points: ["UX & interaction design", "Design systems", "Prototyping and usability testing"],
  },
  {
    id: "service-engineering",
    title: "Engineering",
    summary: "Web, mobile and cloud platforms built for reliability and speed.",
    points: ["Web & mobile apps", "APIs and cloud platforms", "Quality engineering"],
  },
  {
    id: "service-growth",
    title: "Growth & marketing",
    summary: "Launch plans, content and analytics that turn great products into growing ones.",
    points: ["Go-to-market planning", "Content & campaigns", "Analytics and experimentation"],
  },
];

function projectContent(id: string): InteractionContent {
  const p = projects.find((x) => x.id === id)!;
  return {
    id,
    kind: "project",
    title: p.title,
    subtitle: p.client,
    description: p.summary,
    details: p.outcomes,
    image: p.image ? { src: p.image, alt: `${p.title} preview` } : undefined,
    destinationId: "room-gallery",
    actions: [
      { type: "internal", label: "All projects", section: "projects" },
      { type: "contact", label: "Discuss a project", topic: "project" },
    ],
  };
}

export const interactionContent: InteractionContent[] = [
  {
    id: "company",
    kind: "room",
    title: `${company.name} HQ`,
    subtitle: `Founded ${company.founded} · ${company.headcount}`,
    description: company.description,
    destinationId: "room-reception",
    actions: [
      { type: "internal", label: "About us", section: "about" },
      { type: "directory", label: "Staff directory" },
      { type: "contact", label: "Get in touch", topic: "general" },
    ],
  },
  {
    id: "plant",
    kind: "object",
    title: "Plant",
    description: "Adds natural beauty and improves air quality. There are more than 140 plants across the campus — our team takes turns looking after them.",
    destinationId: "room-reception",
  },
  {
    id: "visitor",
    kind: "person",
    title: "Visitor",
    subtitle: "Guest",
    description: "Guests wait here before their meetings. Reception lets their host know they've arrived.",
    destinationId: "room-reception",
    actions: [{ type: "contact", label: "Plan a visit", topic: "meeting" }],
  },
  {
    id: "directory-board",
    kind: "object",
    title: "Building Directory",
    description: "Every floor, room and team in the building. Search for a colleague and we'll show you the way.",
    actions: [{ type: "directory", label: "Open staff directory" }],
  },
  ...projects.filter((p) => p.status === "case-study").map((p) => projectContent(p.id)),
  {
    id: "company-story",
    kind: "object",
    title: "Our Story",
    subtitle: `${company.founded} → today`,
    description: "From a three-person studio to a team of 120+ designers, engineers and strategists working with clients worldwide.",
    details: ["2012 — Founded above a harbour café", "2017 — Opened the design studio", "2021 — Moved to the Harbour Campus", "2026 — 300+ products shipped"],
    destinationId: "room-story",
    actions: [{ type: "internal", label: "About us", section: "about" }],
  },
  {
    id: "services",
    kind: "service",
    title: "What we do",
    description: "Strategy, design, engineering and growth — one team from the first workshop to launch and beyond.",
    details: services.map((s) => s.title),
    destinationId: "room-story",
    actions: [
      { type: "internal", label: "Explore services", section: "services" },
      { type: "contact", label: "Start a project", topic: "services" },
    ],
  },
  {
    id: "elevator",
    kind: "object",
    title: "Elevator",
    description: "Travel between the ground floor, Level 1 and the rooftop lounge.",
    actions: [{ type: "elevator", label: "Choose a floor", buildingId: "hq" }],
  },
  {
    id: "stairs-marketing",
    kind: "object",
    title: "Stairs",
    description: "Connects the marketing floor with the UI/UX design studio upstairs.",
    actions: [{ type: "elevator", label: "Choose a floor", buildingId: "marketing" }],
  },
  {
    id: "stairs-sales",
    kind: "object",
    title: "Stairs",
    description: "Connects the sales floor with the partnerships & client success team upstairs.",
    actions: [{ type: "elevator", label: "Choose a floor", buildingId: "sales" }],
  },
  {
    id: "sustainability",
    kind: "object",
    title: "Solar Roof",
    description: "48 solar panels supply around a third of the headquarters' daytime electricity.",
    details: ["Fun fact: the skylight next to it lights the stairwell all day."],
    destinationId: "room-rooftop",
  },
  {
    id: "fountain",
    kind: "object",
    title: "Harbour Fountain",
    description: "The heart of the campus plaza — and the most popular spot for lunch on sunny days.",
    destinationId: "plaza",
  },
  {
    id: "wellness-pool",
    kind: "room",
    title: "Wellness Pool",
    description: "Recharge between meetings. The pool and deck are open to the whole team from 7:00 to 21:00.",
    destinationId: "pool",
    actions: [{ type: "contact", label: `Careers at ${company.name}`, topic: "careers" }],
  },
];

const contentById = new Map(interactionContent.map((c) => [c.id, c]));

export function getInteractionContent(id: string): InteractionContent | undefined {
  return contentById.get(id);
}
