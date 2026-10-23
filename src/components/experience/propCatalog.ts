import type { PropType } from "@/world/types";
import { G, type Part, mergeParts } from "./geometry";

/**
 * Procedural furniture, vegetation and vehicles. Each prop faces +Z at ry = 0 and
 * stands on y = 0. These are clean placeholders that can be swapped for GLB models
 * through the asset manifest (see public/models/ASSET_LICENSES.md).
 */

const LEAF = "#4f9a3f";

function desk(): Part[] {
  return [
    { geometry: G.box(1.38, 0.04, 0.7, 0, 0.74, 0), material: "tint", tint: "#d9b88c" },
    { geometry: G.box(0.04, 0.72, 0.64, -0.64, 0.36, 0), material: "frame" },
    { geometry: G.box(0.04, 0.72, 0.64, 0.64, 0.36, 0), material: "frame" },
    { geometry: G.box(1.26, 0.28, 0.02, 0, 0.52, -0.3), material: "frame" },
    { geometry: G.box(0.44, 0.02, 0.14, 0, 0.77, 0.12), material: "black" },
    { geometry: G.box(0.07, 0.02, 0.1, 0.34, 0.77, 0.12), material: "black" },
    { geometry: G.cyl(0.04, 0.035, 0.1, -0.5, 0.81, -0.12, 8), material: "white" },
  ];
}

function monitor(): Part[] {
  return [
    { geometry: G.box(0.22, 0.02, 0.16, 0, 0.01, 0), material: "black" },
    { geometry: G.box(0.04, 0.26, 0.03, 0, 0.14, -0.02), material: "black" },
    { geometry: G.box(0.62, 0.38, 0.03, 0, 0.42, 0), material: "black" },
    { geometry: G.box(0.57, 0.33, 0.005, 0, 0.42, 0.017), material: "screen", castShadow: false },
  ];
}

function deskChair(): Part[] {
  return [
    { geometry: G.box(0.48, 0.08, 0.46, 0, 0.47, 0), material: "black" },
    { geometry: G.box(0.46, 0.52, 0.06, 0, 0.82, -0.23, -0.12), material: "black" },
    { geometry: G.cyl(0.03, 0.03, 0.38, 0, 0.25, 0, 8), material: "frame" },
    { geometry: G.cyl(0.3, 0.3, 0.04, 0, 0.05, 0, 10), material: "frame" },
    { geometry: G.box(0.05, 0.04, 0.3, -0.25, 0.64, 0), material: "frame" },
    { geometry: G.box(0.05, 0.04, 0.3, 0.25, 0.64, 0), material: "frame" },
  ];
}

function meetingChair(): Part[] {
  return [
    { geometry: G.box(0.5, 0.07, 0.48, 0, 0.47, 0), material: "black" },
    { geometry: G.box(0.5, 0.55, 0.06, 0, 0.8, -0.24, -0.1), material: "black" },
    { geometry: G.cyl(0.03, 0.03, 0.42, 0, 0.23, 0, 8), material: "metal" },
    { geometry: G.cyl(0.28, 0.28, 0.03, 0, 0.03, 0, 10), material: "metal" },
  ];
}

function partition(): Part[] {
  return [{ geometry: G.box(4.2, 0.36, 0.04, 0, 0.94, 0), material: "frameLight" }];
}

function sofa(width = 2.0): Part[] {
  const t = "#8a9097";
  return [
    { geometry: G.box(width, 0.4, 0.86, 0, 0.24, 0), material: "tint", tint: t },
    { geometry: G.box(width, 0.46, 0.2, 0, 0.62, -0.33), material: "tint", tint: t },
    { geometry: G.box(0.18, 0.56, 0.86, -width / 2 + 0.09, 0.32, 0), material: "tint", tint: t },
    { geometry: G.box(0.18, 0.56, 0.86, width / 2 - 0.09, 0.32, 0), material: "tint", tint: t },
    { geometry: G.box(width - 0.2, 0.1, 0.12, 0, 0.06, 0), material: "black" },
  ];
}

function coffeeTable(): Part[] {
  return [
    { geometry: G.box(1.1, 0.05, 0.62, 0, 0.42, 0), material: "woodLight" },
    { geometry: G.box(0.9, 0.36, 0.42, 0, 0.2, 0), material: "frame" },
  ];
}

function plantTall(): Part[] {
  return [
    { geometry: G.cyl(0.22, 0.17, 0.5, 0, 0.25, 0, 14), material: "pot" },
    { geometry: G.cyl(0.03, 0.03, 0.8, 0, 0.85, 0, 6), material: "woodDark" },
    { geometry: G.ico(0.36, 0, 1.35, 0, 1, 1.15, 1), material: "leaf", tint: LEAF },
    { geometry: G.ico(0.28, 0.14, 1.62, 0.05, 1, 1.2, 1), material: "leaf", tint: LEAF },
    { geometry: G.ico(0.26, -0.16, 1.08, 0.1, 1, 1, 1), material: "leaf", tint: LEAF },
  ];
}

function plantBush(): Part[] {
  return [
    { geometry: G.cyl(0.3, 0.26, 0.45, 0, 0.225, 0, 14), material: "potDark" },
    { geometry: G.ico(0.46, 0, 0.78, 0, 1, 0.9, 1), material: "leaf", tint: "#5aa845" },
    { geometry: G.ico(0.32, 0.22, 0.98, 0.1, 1, 1, 1), material: "leaf", tint: "#5aa845" },
  ];
}

function plantSmall(): Part[] {
  return [
    { geometry: G.cyl(0.07, 0.06, 0.12, 0, 0.06, 0, 8), material: "pot" },
    { geometry: G.ico(0.1, 0, 0.18, 0, 1, 1, 1), material: "leaf", tint: LEAF },
  ];
}

function planter(): Part[] {
  return [
    { geometry: G.box(1.5, 0.55, 0.6, 0, 0.275, 0), material: "concrete" },
    { geometry: G.ico(0.38, -0.4, 0.75, 0, 1, 0.8, 1), material: "leaf", tint: "#4f9a3f" },
    { geometry: G.ico(0.42, 0.35, 0.78, 0, 1, 0.85, 1), material: "leaf", tint: "#4f9a3f" },
  ];
}

function bookshelf(): Part[] {
  const parts: Part[] = [
    { geometry: G.box(1.9, 2.1, 0.06, 0, 1.05, -0.15), material: "woodMid" },
    { geometry: G.box(0.05, 2.1, 0.36, -0.93, 1.05, 0), material: "woodMid" },
    { geometry: G.box(0.05, 2.1, 0.36, 0.93, 1.05, 0), material: "woodMid" },
  ];
  for (let i = 0; i < 5; i++) parts.push({ geometry: G.box(1.82, 0.04, 0.34, 0, 0.05 + i * 0.5, 0), material: "woodMid" });
  const colors = ["brandBlue", "fabricOlive", "woodDark", "accentGreen", "white"] as const;
  for (let s = 0; s < 4; s++) {
    let x = -0.85;
    let k = s;
    while (x < 0.8) {
      const w = 0.05 + ((k * 37) % 5) * 0.012;
      const h = 0.28 + ((k * 13) % 4) * 0.035;
      parts.push({ geometry: G.box(w, h, 0.24, x + w / 2, 0.07 + s * 0.5 + h / 2, 0.02), material: colors[k % colors.length] });
      x += w + 0.008;
      k += 3;
    }
  }
  return parts;
}

function tree(): Part[] {
  return [
    { geometry: G.cyl(0.16, 0.24, 2.3, 0, 1.15, 0, 8), material: "woodDark" },
    { geometry: G.ico(1.65, 0, 3.0, 0, 1, 0.82, 1), material: "leaf", tint: LEAF },
    { geometry: G.ico(1.25, 0.25, 4.05, -0.15, 1, 0.85, 1), material: "leaf", tint: LEAF },
    { geometry: G.ico(0.85, -0.1, 4.85, 0.1, 1, 0.9, 1), material: "leaf", tint: LEAF },
  ];
}

function treeRound(): Part[] {
  return [
    { geometry: G.cyl(0.15, 0.22, 2.0, 0, 1.0, 0, 8), material: "woodDark" },
    { geometry: G.ico(1.75, 0, 3.4, 0, 1, 0.9, 1), material: "leaf", tint: LEAF },
    { geometry: G.ico(1.05, 1.1, 3.0, 0.5, 1, 0.9, 1), material: "leaf", tint: LEAF },
    { geometry: G.ico(1.0, -0.9, 3.2, -0.7, 1, 0.9, 1), material: "leaf", tint: LEAF },
    { geometry: G.ico(0.95, -0.3, 4.3, 0.6, 1, 0.9, 1), material: "leaf", tint: LEAF },
  ];
}

function bush(): Part[] {
  return [
    { geometry: G.ico(0.7, 0, 0.45, 0, 1, 0.75, 1), material: "leaf", tint: "#4f8f3a" },
    { geometry: G.ico(0.5, 0.45, 0.4, 0.2, 1, 0.75, 1), material: "leaf", tint: "#4f8f3a" },
  ];
}

function car(): Part[] {
  const body = "#e8ecef";
  const parts: Part[] = [
    { geometry: G.box(1.9, 0.55, 4.2, 0, 0.6, 0), material: "tint", tint: body },
    { geometry: G.box(1.62, 0.5, 2.2, 0, 1.1, -0.25), material: "glassDark" },
    { geometry: G.box(1.58, 0.07, 2.0, 0, 1.37, -0.25), material: "tint", tint: body },
    { geometry: G.box(1.7, 0.12, 0.05, 0, 0.62, 2.11), material: "glow" },
    { geometry: G.box(1.7, 0.12, 0.05, 0, 0.66, -2.11), material: "frame" },
  ];
  for (const [x, z] of [
    [-0.88, 1.35],
    [0.88, 1.35],
    [-0.88, -1.35],
    [0.88, -1.35],
  ] as const) {
    parts.push({ geometry: G.cyl(0.34, 0.34, 0.26, x, 0.34, z, 12, 0, 0, Math.PI / 2), material: "black" });
  }
  return parts;
}

function streetLamp(): Part[] {
  return [
    { geometry: G.cyl(0.07, 0.09, 4.0, 0, 2.0, 0, 8), material: "frame" },
    { geometry: G.box(0.08, 0.08, 0.7, 0, 3.95, 0.3), material: "frame" },
    { geometry: G.box(0.32, 0.1, 0.42, 0, 3.9, 0.62), material: "frame" },
    { geometry: G.box(0.26, 0.03, 0.36, 0, 3.84, 0.62), material: "glow", castShadow: false },
    { geometry: G.cyl(0.18, 0.2, 0.18, 0, 0.09, 0, 10), material: "frame" },
  ];
}

function bench(): Part[] {
  return [
    { geometry: G.box(1.8, 0.06, 0.46, 0, 0.45, 0.02), material: "woodMid" },
    { geometry: G.box(1.8, 0.36, 0.05, 0, 0.74, -0.2, -0.1), material: "woodMid" },
    { geometry: G.box(0.06, 0.45, 0.46, -0.78, 0.22, 0), material: "frame" },
    { geometry: G.box(0.06, 0.45, 0.46, 0.78, 0.22, 0), material: "frame" },
  ];
}

function umbrella(): Part[] {
  return [
    { geometry: G.cyl(0.04, 0.04, 2.6, 0, 1.3, 0, 8), material: "white" },
    { geometry: G.cone(1.7, 0.55, 0, 2.55, 0, 16), material: "white" },
    { geometry: G.cyl(0.3, 0.34, 0.08, 0, 0.04, 0, 12), material: "frame" },
  ];
}

function lounger(): Part[] {
  return [
    { geometry: G.box(0.72, 0.26, 1.9, 0, 0.18, 0), material: "white" },
    { geometry: G.box(0.66, 0.08, 1.3, 0, 0.35, 0.25), material: "fabricLight" },
    { geometry: G.box(0.66, 0.08, 0.62, 0, 0.56, -0.62, 0.7), material: "fabricLight" },
  ];
}

function solarPanel(): Part[] {
  return [
    { geometry: G.box(1.3, 0.05, 1.65, 0, 0.62, 0, 0.42), material: "solar" },
    { geometry: G.box(0.06, 0.55, 0.06, -0.55, 0.3, -0.5), material: "metal" },
    { geometry: G.box(0.06, 0.95, 0.06, -0.55, 0.47, 0.5), material: "metal" },
    { geometry: G.box(0.06, 0.55, 0.06, 0.55, 0.3, -0.5), material: "metal" },
    { geometry: G.box(0.06, 0.95, 0.06, 0.55, 0.47, 0.5), material: "metal" },
  ];
}

function picnicTable(): Part[] {
  return [
    { geometry: G.box(1.9, 0.06, 0.82, 0, 0.75, 0), material: "woodMid" },
    { geometry: G.box(1.9, 0.05, 0.3, 0, 0.45, 0.68), material: "woodMid" },
    { geometry: G.box(1.9, 0.05, 0.3, 0, 0.45, -0.68), material: "woodMid" },
    { geometry: G.box(0.08, 0.75, 1.6, -0.75, 0.37, 0), material: "woodDark" },
    { geometry: G.box(0.08, 0.75, 1.6, 0.75, 0.37, 0), material: "woodDark" },
  ];
}

function stool(): Part[] {
  return [
    { geometry: G.cyl(0.2, 0.2, 0.06, 0, 0.74, 0, 12), material: "black" },
    { geometry: G.cyl(0.03, 0.03, 0.72, 0, 0.37, 0, 8), material: "metal" },
    { geometry: G.cyl(0.2, 0.22, 0.03, 0, 0.02, 0, 12), material: "metal" },
  ];
}

function railPost(): Part[] {
  return [{ geometry: G.cyl(0.04, 0.04, 1.04, 0, 0.52, 0, 6), material: "metal" }];
}

function kioskBase(): Part[] {
  return [
    { geometry: G.box(0.5, 0.8, 0.4, 0, 0.4, 0), material: "white" },
    { geometry: G.box(0.98, 1.4, 0.1, 0, 1.42, -0.05), material: "black" },
  ];
}

function pendant(): Part[] {
  return [
    { geometry: G.cyl(0.008, 0.008, 1.2, 0, 0.6, 0, 4), material: "frame", castShadow: false },
    { geometry: G.cone(0.32, 0.26, 0, -0.05, 0, 18), material: "frame", castShadow: false },
    { geometry: G.cyl(0.24, 0.24, 0.02, 0, -0.17, 0, 18), material: "glow", castShadow: false },
  ];
}

function mug(): Part[] {
  return [{ geometry: G.cyl(0.045, 0.04, 0.1, 0, 0.05, 0, 8), material: "white" }];
}

function armchair(): Part[] {
  return sofa(0.95);
}

const BUILDERS: Record<PropType, () => Part[]> = {
  desk,
  deskChair,
  monitor,
  deskLamp: plantSmall,
  partition,
  meetingChair,
  sofa: () => sofa(2.0),
  armchair,
  coffeeTable,
  plantTall,
  plantBush,
  plantSmall,
  planter,
  bookshelf,
  tree,
  treeRound,
  bush,
  car,
  streetLamp,
  bench,
  umbrella,
  lounger,
  solarPanel,
  picnicTable,
  stool,
  railPost,
  kioskBase,
  pendant,
  mug,
};

const catalog = new Map<PropType, Part[]>();

/** Merged parts for a prop type (built once, shared by all instances). */
export function getPropParts(type: PropType): Part[] {
  let parts = catalog.get(type);
  if (!parts) {
    parts = mergeParts(BUILDERS[type]());
    catalog.set(type, parts);
  }
  return parts;
}
