# Implementation report — Corporate Virtual Office V1.0

Date: 2026-10-10 · Scope: PRD v1.0, TRD v1.0, Claude Code implementation prompt, approved design direction image.

## 0. Upgrade: realistic corporate office (v1.1)

The v1.0 campus was upgraded in place. It was not re-scaffolded, and all v1.0 features are
kept: movement, collision, camera, cutaway, destinations, mini-map, contact flow, fallbacks
and quality tiers. The buildings now hold an organised, data-driven workplace.

### Data model (content separate from rendering)

| File | Contents |
| --- | --- |
| `src/types/organization.ts` | `Person`, `Department`, `Project`, `RoomConfig` (11 room kinds), `Fixture` (28 furniture/decor types), `PartitionConfig` |
| `src/data/company.ts` | Company identity, brand colours, contact settings |
| `src/data/organization.ts` | **Sample data**, flagged in the UI: 8 departments, 39 people, 11 projects (3 case studies, 8 active) |
| `src/data/office-layout.ts` | 18 rooms and 10 interior partitions with doors |
| `src/config/company-schema.ts` | Zod schemas plus `validateOrganization()`: ids, cross-references, seat capacity, shared seats, one CEO, at least one receptionist, entry points, door placement |
| `src/lib/organization.ts` | The only place team lists are derived from: `membersOf`, `leadOf`, `peopleInRoom`, `searchDirectory`, `locationLabel`… |
| `src/lib/entities.ts` | Resolves any selected id to a person, a room or an object card |
| `src/world/office.ts` | Builds the following from the layout: floors, partitions (glass, frosted, wood) with door frames and plaques, furniture, 109 seats, colliders, zones, room outlines and doorways, and the 39 placed people |

Staff are linked only through `person.departmentId` and `person.location {roomId, seat}`.
No component keeps its own employee list.

### Rooms

| Building · floor | Rooms |
| --- | --- |
| HQ ground | Reception (logo wall, reception desk with receptionist), Visitor Waiting Area, Lift lobby (directory board), HR & Finance Cabin, Projects Gallery, Café & Lounge, Our Story & Services |
| HQ level 1 | CEO Cabin (wood floor, executive desk, monitor, visitor chairs, sofa, bookshelves, art), Engineering Cabin, Open Workspace (2 × 8 individual workstations), Conference Room (12-seat table, pendant lights, screen, whiteboard), Collaboration Lounge, corridor |
| HQ roof | Rooftop Lounge |
| Pavilions | Marketing, UI/UX Design Studio, Sales & Business Development, Partnerships & Client Success |

Each room has its own floor finish, accent colour, wall graphics and furniture mix.

### Interactions

- **Selecting a room:** click its floor, furniture, door plaque or zoomed-in name tag, or pick
  it from the Map, which is grouped by building and floor. The room is tinted, outlined, and its
  doorways pulse. Rooms entered from stairs or a lift mark that landing as their doorway. Walking
  to a room highlights it on the way.
- **Room cards by kind:**
  - Reception: host, company intro, visitor guidance, contact and hours, Staff directory, Plan
    a visit.
  - CEO cabin: profile summary, leadership message, appointment request.
  - Team cabins: lead, members, responsibilities, active projects, team contact.
  - Workspace: the people seated there.
  - Conference room: capacity, purpose, sample sessions with participants, and a booking
    request, with the note "doesn't show live availability".
- **Person profiles:** avatar, title, department (links to the team room), location, bio. The
  CEO adds a vision and leadership message and their background. Every profile shows skills,
  responsibilities and projects, with Contact, Request an appointment (where enabled) and Take
  me there.
- **People and desks:** clicking a person or their desk opens their profile; clicking an empty
  desk opens the room card.
- **CEO cabin walk-in:** walking in and stopping for half a second opens the CEO profile. The
  reception does the same with its own card.
- **Staff directory** (top bar, reception card, directory boards, About dialog): accent-
  insensitive search across name, role, team, skill and room, plus team filter chips. Choosing a
  person opens their profile and cuts the building open to their floor; the footprint button
  walks there. Without 3D, rows expand into inline profiles with contact actions.
- **Back** appears when a card was opened from another card. ✕ and Esc close, and Overview
  returns to the campus view.

### Changed files

- **New:**
  - Data and model: `src/types/organization.ts`, `src/data/company.ts`,
    `src/data/organization.ts`, `src/data/office-layout.ts`, `src/config/company-schema.ts`
  - Logic: `src/lib/organization.ts`, `src/lib/entities.ts`, `src/world/office.ts`
  - UI: `src/components/interface/Avatar.tsx`, `StaffDirectory.tsx`, `panels/PanelParts.tsx`,
    `panels/PersonPanel.tsx`, `panels/RoomPanel.tsx`
  - Tests: `tests/unit/organization.test.ts`, `tests/e2e/office.spec.ts`
- **Modified:**
  - World: `src/world/types.ts`, `builder.ts`, `campus.ts` (HQ and pavilion interiors replaced
    by the layout; shells kept)
  - Rendering (`src/components/experience/`): `materials.ts`, `textures.ts`, `propCatalog.ts`,
    `Specials.tsx`, `StaticWorld.tsx`, `Surfaces.tsx`, `CameraRig.tsx`,
    `CharacterController.tsx`, `DestinationMarkers.tsx`
  - UI (`src/components/interface/`): `InfoPanel.tsx`, `CompanyContent.tsx`,
    `ExperienceShell.tsx`, `ErrorFallback.tsx`, `TopBar.tsx`, `ScreenLabels.tsx`,
    `DestinationPanel.tsx`, `MiniMap.tsx`
  - Config, data and state: `src/data/company-content.ts`, `src/types/experience.ts`,
    `src/config/destinations.ts`, `src/config/interactions.ts`, `src/lib/store.ts`,
    `src/lib/actions.ts`, `src/lib/debug.ts`
  - Existing E2E specs: `helpers.ts`, `interactions.spec.ts`, `journey.spec.ts`,
    `panels.spec.ts`, `contact.spec.ts`
  - Docs: `README.md`

### Verification (upgrade run)

| Command | Result |
| --- | --- |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 problems |
| `npm run test` | ✅ 7 files, **252 tests passed** (17 new organization/directory/entity/world tests; the world suite checks every seat and room is reachable) |
| `npm run build` | ✅ success |
| `npx playwright test` | ✅ **48 passed** (45 desktop Chrome, 3 mobile Pixel 7) |

The new E2E tests click through real raycasts:
- receptionist, CEO, a seated engineer's desk, the conference room, Sarah, David and Maya;
- directory search, team filter, profile and walking to the desk across buildings;
- the team cabin card with lead and members, member profile and Back;
- the reception card opening the directory;
- the CEO cabin walk-in auto-open;
- the grouped Map, room labels, the conference booking note and request, and the CEO
  appointment request;
- inline profiles in the no-WebGL fallback.

Each room card was also checked visually in Chrome (1536×864) and on Pixel 7 emulation.

### Remaining limitations of the upgrade

- People, projects and meeting sessions are **sample data**. Meeting rooms show no live
  availability, and booking sends an enquiry through the contact form.
- Room walls must stay inside the existing building shells. The layout can rearrange rooms and
  furniture, but the facades in `campus.ts` are not generated from it.
- Seated staff are static. Only standing leads, the CEO and the receptionist are animated.
  Characters are procedural and are not rigged GLB models.
- Avatars are generated SVG portraits, not photos. A `photo` field could be added once real,
  consented photos exist.
- Some decorative furniture (bookshelves, sofas, cabinets) is selectable only as part of its
  room, not as an individual object card.

## 1. Summary (v1.0)

The repository contained only the specification documents and the design image, so the
project was scaffolded from scratch as specified by the TRD (Next.js App Router + TypeScript +
React Three Fiber + Drei + Tailwind). The result is a real-time 3D site with:

- An isometric harbour campus: a three-storey glass HQ with a dark "YOUR COMPANY" crown and
  rooftop lounge, two two-storey pavilions (Marketing / Design studio, Sales / Customer success)
  with dollhouse-cutaway upper floors, a fountain plaza, an avenue with an entrance gate, a pool
  deck, parking, a team garden, a quay with a pier and sailboat, and 198 trees.
- Furnished interiors: reception with a slatted logo wall, a projects gallery, a story timeline
  and services kiosk, a café, an open workspace with a green accent wall, a glass meeting room,
  an executive office, and the design studio with its mood board. 109 background staff are
  shown seated or standing, plus 5 named team members.
- A controllable, animated character: WASD/arrows/joystick movement, Shift to run, collision,
  click-to-move with pathfinding, and automatic elevator/stair rides between floors.
- A camera with clamped orbit, pan and zoom, eased transitions, character follow, Q/E rotation,
  an overview reset, and a reduced-motion mode.
- 50 interactive anchors over 27 content records: rooms, people, objects, projects and services.
  Each opens a white info card with actions: contact, book a meeting, company sections, walk
  here, and the floor picker.
- HTML interface matching the design language: navy glass side navigation (Overview, Floors,
  Map), a location chip, floating campus pins, a WASD legend, a circular compass mini-map you
  can click to walk, a first-visit tip, help and settings panels, a "Walking to…" status with
  Skip/Cancel, a contact/meeting form, and an "About us" 2D content dialog.
- Fallbacks: a full 2D site when WebGL is unavailable or the GPU context is lost, a loading
  escape hatch after 15 s, and a `<noscript>` summary.

## 2. Acceptance criteria (PRD §7)

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Scene loads with entry/overview state | ✅ | E2E `loads with a branded entry state…` |
| 2 | WASD/arrow movement in walkable space | ✅ | E2E `WASD moves…`, `arrow keys move…` |
| 3 | Collision with walls & furniture | ✅ | E2E facade test; unit `character collision` (walls, sub-stepping, circles, bounds) |
| 4 | Orbit/pan/zoom + reset | ✅ | E2E `camera zoom, rotate and overview reset` (zoom, rotate, polar clamp) |
| 5 | Destination navigation | ✅ | E2E Map → Reception; cross-floor route to Meeting Room; click-to-move; unit pathfinding tests; every destination is reachable (unit) |
| 6 | ≥ 5 objects open correct info | ✅ | E2E clicks 8 anchors through real raycasts (fountain, plant, Atlas project, services kiosk, Sarah, meeting room, David, pool) plus the elevator |
| 7 | Panels close; keys don't leak | ✅ | E2E close button + Escape; typing in the form doesn't move the character; UI clicks don't reach the canvas |
| 8 | Contact works, reports truthfully | ✅ (hand-off) | E2E validation and mailto hand-off; API route 400/415/503; unit success/error/timeout/rate-limit. **Online delivery requires an endpoint (see §6).** |
| 9 | Touch controls | ✅ | E2E Pixel 7: joystick walks, touch-sized buttons, panels fit, tap selects |
| 10 | Unsupported WebGL / failures handled | ✅ | E2E no-WebGL fallback; context-loss fallback; error boundary |
| 11 | No P0 console errors | ✅ | E2E asserts zero console errors; production audit: 0 errors (warnings in §5) |
| 12 | Content replaceable via config | ✅ | `src/data/company-content.ts`, `src/config/*`; validated by unit test |

## 3. Commands run and results (v1.0 final run; see §0 for the upgrade run)

| Command | Result |
| --- | --- |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 problems |
| `npm run test` | ✅ 6 files, **115 tests passed** |
| `npm run build` | ✅ success (`/` static, `/api/contact` dynamic) |
| `npx playwright test` | ✅ **36 passed** (33 desktop Chrome 1440×900, 3 mobile Pixel 7 emulation) |

## 4. Performance observations

Measured on this development machine only (Windows 11, AMD Radeon integrated graphics via
ANGLE/D3D11, Chrome 154, production build, 1536×864, local server):

| Tier | Time to interactive intro | Overview FPS | Walking FPS |
| --- | --- | --- | --- |
| High (shadows, N8AO ambient occlusion, SMAA, environment reflections, walkers) | 2.7 s | avg 58 (min 56) | avg 57 (min 50) |
| Low (no shadows/AO, DPR ≤ 1.5) | 1.3 s | 60 | 60 |

- First-load transfer: about 662 KB JavaScript and 57 KB CSS (compressed). There are no model,
  texture or HDR downloads; all textures are drawn on canvas at runtime.
- About 350 draw calls for the whole campus (instanced walls, props and people).
- Composer MSAA ×4 cost about 45 % of the frame rate on the integrated GPU, so SMAA is used instead.
- "Automatic" quality picks Low on phones, ≤ 4 cores, ≤ 4 GB RAM or Data Saver. A frame-rate
  monitor also drops to Low if FPS stays under 50.

## 5. Known limitations and untested areas

- **Placeholder models.** People, furniture, vehicles and trees are clean procedural low-poly
  stand-ins. The character uses a procedural walk/idle cycle, not a rigged GLB with blended
  clips. The replacement path is documented in `public/models/ASSET_LICENSES.md`.
- **Floor changes** via elevator or stairs are a short fade-and-teleport. The character does not
  physically climb the stair geometry.
- **Background staff** are static. The six ambient walkers ignore collisions, so the visitor can
  pass through them.
- **Camera vs geometry.** Clipping is prevented by angle and distance clamps plus automatic
  cutaway, not by camera collision. Rotating very close to a facade can still briefly show
  through glass.
- **Clicks on wall pixels** pass through to the floor behind them, so the character walks to
  the nearest reachable spot there.
- **Contact delivery** is not connected (no endpoint or webhook was provided). The form hands off
  to the visitor's email app and says so explicitly.
- **Rate limiting** in `/api/contact` is in-memory per server instance.
- **Browser and device coverage.** Tested in Chrome (desktop) and Chrome mobile emulation only.
  Not tested: Safari/iOS, Firefox, Edge, real Android/iOS hardware, low-end GPUs, or
  screen-reader walkthroughs. Edge shares Chrome's engine but was not run.
- **Console warnings** from dependencies (harmless):
  - `THREE.Clock: This module has been deprecated` (raised inside @react-three/fiber 9.8.1).
  - Two Direct3D shader-compiler notices (`X4122`, `X3595`) from ANGLE on Windows.
- **Lint scope.** `react-hooks/immutability` is disabled for `src/components/experience/**` only,
  because React Three Fiber mutates three.js objects per frame by design (the React Compiler is
  not enabled).
- **Interior images** in the PRD's optional `image` field are used only for projects. Team
  avatars are generated SVG portraits (v1.1).

## 6. Decisions requiring owner approval

1. **Contact delivery**: choose a form service URL or a webhook (`CONTACT_WEBHOOK_URL` with
   `NEXT_PUBLIC_CONTACT_ENDPOINT=/api/contact`), and confirm the spam and rate-limit policy for
   production.
2. **Real content and branding**: company name, logo, colours, copy, team, projects, contact
   address (currently `hello@yourcompany.example`), and privacy-policy URL.
3. **3D asset budget**: whether to commission or license custom GLB characters and furniture to
   replace the procedural placeholders.
4. **Analytics**: provider and consent mechanism (currently disabled).
5. **Hosting target**: any Node host; the home page is static and only `/api/contact` needs a
   server.
