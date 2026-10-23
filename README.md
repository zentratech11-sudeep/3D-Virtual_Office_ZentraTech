# Corporate Virtual Office

A browser-based, stylised isometric 3D office campus where visitors walk a character around,
explore an organised corporate workplace floor by floor (reception, CEO cabin, team cabins, open
workspace, conference room, lounges), click people, desks, rooms and objects to learn about the
company, search a staff directory, and get in touch. Built from `Corporate_Virtual_Office_PRD_v1.0.md`,
`Corporate_Virtual_Office_TRD_v1.0.md` and the approved design direction image.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · React Three Fiber 9 + Drei 10 ·
Tailwind CSS 4 · Zustand · Zod · Vitest · Playwright.

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
```

Production:

```bash
npm run build
npm run start          # http://localhost:3000
```

Requires Node.js ≥ 20.9 (developed on Node 25).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build / server |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm run test` | Unit tests (Vitest): organization data model, directory search, content config, world data (rooms, seats, reachability), collision, pathfinding, state machine, validation, contact delivery |
| `npm run test:e2e` | Browser tests (Playwright) against a production build on port 3218. Uses the installed Google Chrome; set `PW_CHANNEL=chromium` after `npx playwright install chromium` to use the bundled browser |
| `npm run verify` | typecheck + lint + unit tests + build |

## Controls

| Desktop | Touch |
| --- | --- |
| **W A S D / arrow keys** walk (camera-relative), **Shift** run | On-screen joystick |
| **Left-drag** rotate, **right-drag** pan (overview), **wheel** zoom | One-finger drag rotate, pinch zoom |
| **Q / E** rotate 45°, **+ / −** zoom | Buttons beside the mini-map |
| **Click floor** walk there · **click person/room/object** info card | Tap |
| **Esc** closes the top-most card/dialog | Close buttons |

Navigation UI: **Overview**, **Floors** (view a floor in cutaway or walk there), **Map**
(every room grouped by building and floor, return to entrance), **Directory** (search staff,
open a profile, "Take me there"), room-name tags when zoomed in (click to open the room card),
the circular mini-map (click to walk), and floating campus pins. Cards that were opened from
another card show a **Back** button; **Esc** or ✕ closes.

## The office

| Building · floor | Rooms |
| --- | --- |
| Headquarters · Ground | Reception (receptionist, company intro, visitor guidance, contact, staff directory), Visitor Waiting Area, Lift lobby with directory board, HR & Finance Cabin, Projects Gallery, Café & Lounge, Our Story & Services |
| Headquarters · Level 1 | CEO Cabin (executive desk, visitor chairs, sofa, bookshelves; walking in opens the CEO profile), Engineering Cabin, Open Workspace (16 individual workstations), Conference Room (12 seats, screen, pendants; sessions and booking request), Collaboration Lounge, corridor |
| Headquarters · Rooftop | Rooftop Lounge |
| Marketing pavilion | Marketing (ground), UI/UX Design Studio (upper) |
| Sales pavilion | Sales & Business Development (ground), Partnerships & Client Success (upper) |

Every room is selectable: click its floor, furniture, door plaque or name tag, or pick it from
the Map. The selected room (or the room you are walking to) is tinted and its doorways pulse.
Clicking a person or their desk opens their profile; empty desks open the room card.

## Contact delivery (environment variables)

Copy `.env.example` to `.env.local`.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CONTACT_ENDPOINT` | build-time, public | Where the form POSTs JSON. Empty = **mailto hand-off**: the form validates, then tells the visitor the message is *not sent yet* and offers "Open email app" / "Copy message". Use `/api/contact` for the built-in route, or a form service URL (e.g. Formspree) that accepts JSON. |
| `CONTACT_WEBHOOK_URL` | server-only | Used by `/api/contact` to forward validated enquiries (Slack, Zapier, Make, CRM webhook…). Without it the route answers **503** and the UI reports "not sent". |

The UI only reports "Message sent" after a 2xx response. `/api/contact` validates server-side
with the same Zod schema, rejects a honeypot field, limits 5 requests / 10 min per IP (in-memory,
per instance — use a shared store such as Redis if you run several instances) and caps the body at 12 kB.

## Customising the content

All company-specific content is data; rendering code reads it and never hard-codes people or rooms.

| What | Where |
| --- | --- |
| Company name, short name, sign text, tagline, description, email, phone, address, hours, privacy URL | `src/data/company.ts` → `company` |
| Brand colours (UI), consent text, endpoint, booking URL | `src/data/company.ts` → `brand`, `contactSettings` (colours injected as CSS variables in `src/app/layout.tsx`) |
| Departments, people (profiles, seats, looks), projects | `src/data/organization.ts` (**sample data**, marked as demo in the UI) |
| Rooms (kind, rect, floor finish, fixtures/furniture, capacity, sessions, booking, guidance) and partitions/doors | `src/data/office-layout.ts` |
| Services and object cards (plant, fountain, elevator, case studies…) | `src/data/company-content.ts` → `services`, `interactionContent` |
| Card buttons on object cards | `actions`: `contact` (topic/recipient), `internal` (company section), `external` (https only), `navigate` (destination), `elevator`, `directory` |
| Logo | `src/components/interface/Logo.tsx` (`LogoMark`), `src/app/icon.svg`; 3D signs use `companySignText()` and `logoWallTexture()` |
| Floors menu, non-room destinations | `src/config/destinations.ts` (room destinations are generated from the layout) |
| Movement speed, collision radius, camera limits, quality tiers | `src/config/office.ts` |

### Configuring a new company

1. Edit `src/data/company.ts` (name, contact details, brand colours).
2. Replace the departments and people in `src/data/organization.ts`. Each person needs a unique
   `person-…` id, a `departmentId` and a `location: { roomId, seat }`. Team lists, lead cards,
   room member lists, the directory and the About dialog are all derived from this one list.
   Only add information people have agreed to publish: there are no private fields (no phone
   numbers or home addresses), and emails should be work addresses.
3. Adjust rooms in `src/data/office-layout.ts`. Seats come from fixtures:
   - `deskCluster` gives 6 seats;
   - `workstations` gives `count` seats;
   - `leadDesk`, `execDesk` and `receptionDesk` give 1 seat each;
   - `worktable` gives 2 × ⌊length / 1.2⌋ seats.

   Seat indices count in fixture order.
4. Run `npm run test`. `validateOrganization()` (`src/config/company-schema.ts`, Zod) checks:
   - id formats and uniqueness;
   - that department leads belong to their department;
   - that rooms, projects and session participants exist;
   - seat capacity, and that no seat is shared;
   - exactly one CEO and at least one receptionist;
   - that each room's entry point is inside it, and doors sit within their wall.

   The world tests then check that every desk and room can be reached on foot. In development,
   an invalid configuration throws on load.

The rooms' walls are fixed by the building shells in `src/world/campus.ts`, so keep room
rectangles inside the existing buildings unless you also change the shells.

Analytics are **off** by default. `src/lib/analytics.ts` only allows coarse events
(`enter_experience`, `destination_selected`, `info_card_opened`, `enquiry_submitted`,
`fallback_shown`) and requires `hasConsent()` to return true before pushing to `dataLayer`.
No movement traces or personal data are tracked.

## Architecture

```
src/
  app/                    layout (metadata, fonts, brand vars), page (HTML shell + <noscript>), api/contact
  components/
    experience/           client-only React Three Fiber scene (dynamically imported, ssr: false)
      SceneCanvas         <Canvas>, quality tier, context-loss guard, readiness signal
      CameraRig           camera-controls: clamped orbit/pan/zoom, eased transitions, follow mode
      CharacterController keyboard/joystick movement, collision, click-to-move route following, elevators
      CharacterModel      procedural humanoid with walk/idle animation
      StaticWorld         instanced walls/props/background people with per-group visibility + dollhouse cutaway
      Floors, Terrain, Specials, Surfaces, Staff, Lighting, Effects (N8AO + SMAA, high tier)
      InteractiveObject   centralised raycast picking: invisible hit-boxes → stable anchor IDs; walkable floors
      Cutaway             decides which storeys are visible (floor view / character inside / occlusion)
      DestinationMarkers  selection ring + marker, hover ring, click cue, dashed route line
    interface/            HTML UI: shell, loading, intro, top bar, side nav, panels, info card
                          (panels/PersonPanel, RoomPanel), staff directory, avatars, room labels,
                          contact form, company content (also the no-WebGL fallback), mini-map,
                          campus pins, joystick, help, settings, error fallback
  config/                 office settings, destinations, interaction registry, company-schema (Zod model + cross-checks)
  data/                   company.ts, organization.ts (people/departments/projects), office-layout.ts (rooms), company-content.ts
  types/organization.ts   Person, Department, Project, RoomConfig, Fixture, PartitionConfig
  world/                  pure-TS campus description: geometry, colliders, levels, links, zones, anchors;
                          office.ts builds rooms, partitions, furniture, seats and people from the layout
  lib/                    organization selectors (single source), entities (person | room | object), actions,
                          state machine, store, runtime (per-frame state), collision, navigation (grid A*),
                          validation, safe URLs, contact (client + server), analytics, input policy, debug hook
  hooks/                  keyboard, device quality, reduced motion, experience mode
tests/unit, tests/e2e
```

Key decisions:

- **Content separate from rendering.** The organization (people, departments, projects) and the
  office layout (rooms, fixtures, partitions) are validated data. `src/world/office.ts` turns them
  into geometry, seats, colliders, zones and anchors; panels resolve any selected id to a person,
  room or object card (`src/lib/entities.ts`).
- **One world description.** `src/world/campus.ts` (building shells, grounds) plus `office.ts`
  (interiors) describe every wall, prop, floor, collider, level, elevator/stair link, zone and
  interactive anchor as plain data. Rendering, collision,
  pathfinding and tests all read the same data, so visuals and physics cannot drift apart.
- **Single interaction mode** (`src/lib/experience-machine.ts`): `loading → intro → overview ⇄
  walking ⇄ cameraTransition ⇄ objectSelected`, `panelOpen` for modals, `errorFallback`.
  Movement is disabled while a modal is open, while typing, or when focus is inside a panel.
- **Navigation:** circle-vs-rectangle collision with sub-stepping; click-to-move uses an occupancy
  grid rasterised from the same colliders, A* and string-pulling; levels are joined by authored
  elevator/stair links (multi-floor routes ride the elevator automatically).
- **Cutaway:** upper storeys hide when the character is inside, when a floor is chosen in the
  Floors menu, or when a building hides the character from the camera; pavilion walls facing the
  camera drop to sill height.
- **Performance:** ~350 draw calls for the whole campus via instancing and merged geometry; no
  per-frame React state (positions live in `runtime.ts`); capped DPR; two quality tiers with
  automatic selection and a FPS monitor that drops to Low on struggling devices.

## Testing & QA hooks

Open the site with `?debug=1` to expose a read-only inspection API (`window.__CVO__`) used by the
Playwright tests (state, character position, projected anchor positions, renderer stats, anchor
look-ups, seat/room summaries, `show(id)` to open any entity).
`?quality=low|high` forces a quality tier; `?touch=1` forces touch controls.

## Known limitations

See `docs/IMPLEMENTATION_REPORT.md` for the full test report, performance measurements and
open items. In short:

- Characters and furniture are procedural placeholders (no rigged GLB models yet).
- People and projects are sample data.
- Meeting-room sessions are illustrative. There is no live availability, and booking is an
  enquiry form.
- The contact form needs a delivery endpoint before it can send online.
- Real-device testing on iOS/Android and lower-end hardware is still outstanding.
