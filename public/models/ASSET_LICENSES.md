# Asset & licence manifest

Every visual asset shipped with Corporate Virtual Office V1.0 is listed here, with its source,
licence and how to replace it. **No third-party 3D models, textures, HDRIs or audio are used.**
All 3D content is generated in code at runtime, so there is nothing to download and no
licence restriction on commercial deployment or modification.

## 3D content (custom, generated in code)

| Asset group | Where it is defined | Source / licence | Status |
| --- | --- | --- | --- |
| Campus layout, buildings, walls, glazing, floors | `src/world/campus.ts`, `src/components/experience/StaticWorld.tsx` | Custom code, project-owned | Final for V1.0 (custom architecture is recommended by the TRD) |
| Furniture, plants, trees, cars, lamps, benches, umbrellas, solar panels | `src/components/experience/propCatalog.ts` | Custom procedural geometry, project-owned | **Placeholder-quality** — clean low-poly stand-ins |
| People (player, featured staff, background staff, walkers) | `src/components/experience/personGeometry.ts`, `CharacterModel.tsx` | Custom procedural geometry + procedural walk/idle animation, project-owned | **Placeholder** — no rigged/skinned character |
| Fountain, reception desk, elevator doors, stairs, pool, gate, sailboat | `src/components/experience/Specials.tsx` | Custom code, project-owned | Final for V1.0 |
| Floor, wood, grass, paving, water-normal textures | `src/components/experience/textures.ts` | Drawn on `<canvas>` at runtime, project-owned | Final for V1.0 |
| Signage, screens, timeline, mood board, project screens, logo wall | `src/components/experience/textures.ts` | Drawn on `<canvas>` at runtime, project-owned | Replace text/branding via `company-content.ts` |
| Environment reflections | `src/components/experience/Lighting.tsx` (`<Lightformer>` panels) | Generated at runtime — no HDR file | Final |

## 2D assets

| Asset | File | Source / licence |
| --- | --- | --- |
| Logo mark (three bars) | `src/components/interface/Logo.tsx`, `src/app/icon.svg` | Custom, project-owned. **Replace with the client's logo.** |
| Project thumbnails | `public/images/projects/*.svg` | Custom SVG, project-owned. Sample artwork — replace with real case-study images. |

## Fonts, icons and libraries

| Package | Use | Licence |
| --- | --- | --- |
| Inter (`@fontsource-variable/inter`) | UI font, self-hosted (no Google request at runtime) | SIL Open Font License 1.1 |
| Lucide (`lucide-react`) | UI icons | ISC |
| three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing, postprocessing, camera-controls | 3D rendering, camera, effects | MIT |
| Next.js, React, Tailwind CSS, Zustand, Zod | Application framework | MIT |

## Replacing placeholders with production models

The renderer is data-driven: every prop placement in `src/world/campus.ts` references a
`PropType`, and `propCatalog.ts` returns the geometry for that type. To swap in a GLB model:

1. Add the optimised file under `public/models/<group>/` (`furniture/`, `characters/`, …).
   Prefer GLB with Draco/Meshopt compression and ≤ 2k textures.
2. Load it with `useGLTF` and pass the merged mesh geometry to the existing instanced
   renderer (`PropTypeInstances`) so placements, visibility and cutaway keep working.
3. Keep the model's origin on the floor and facing +Z, matching the procedural props.
4. Record the source, author, licence and modifications in the table below.

Recommended commercially-usable sources: Kenney (CC0), Quaternius (CC0), Poly Haven (CC0).
Avoid assets with "non-commercial", "editorial" or "no modification" terms.

| Replacement asset | Source URL | Author | Licence | Modifications |
| --- | --- | --- | --- | --- |
| _none yet_ | | | | |
