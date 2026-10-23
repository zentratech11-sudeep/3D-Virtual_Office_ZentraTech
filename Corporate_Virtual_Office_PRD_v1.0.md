# Corporate Virtual Office — Product Requirements Document (PRD)
**Version:** 1.0  
**Status:** Approved project direction  
**Reference:** User-provided 46-second screen recording showing a stylized, isometric office/campus with a controllable character, cutaway interiors, and contextual labels.

## 1. Product vision
Build a browser-based, stylized 3D corporate environment that visitors can explore like a small game. Users can walk a character through the office, control the camera, jump directly to destinations, and click people, rooms, and objects to learn about the company.

This is a website with a real business purpose—not a game-only experience. It must introduce the company, explain services and teams, and drive contact or meeting enquiries.

## 2. Goals
- Recreate the reference video's core visual language: isometric miniature architecture, open/cutaway rooms, furniture, tiny people, landscaping, and floating labels.
- Support both character movement and camera/destination-based exploration.
- Make key office locations and business information discoverable without confusing users.
- Run in modern desktop browsers and provide a usable touch-friendly mobile mode.
- Keep content and selected visual assets replaceable for future client customization.
- Establish a reliable architecture that can be expanded after V1.0.

## 3. Non-goals for V1.0
- Multiplayer or live presence of multiple visitors.
- Voice conversations or AI employees.
- Full building-construction simulator or unrestricted physics sandbox.
- Complex CRM, employee login, or a complete content-management dashboard.
- Photorealistic AAA graphics.
- Guaranteed identical reproduction of the original creator's exact assets or implementation.

## 4. Target users and primary journeys
### Visitor
1. Opens the site and sees a loading/intro state.
2. Enters the office campus.
3. Moves the character with keyboard or touch controls.
4. Rotates/zooms the camera or clicks a destination.
5. Selects an office, person, or object.
6. Reads a contextual information card.
7. Opens a service, submits an enquiry, or books a meeting.

### Company editor (V1.0 lightweight workflow)
- Company details and interaction content are stored in structured local data/config files.
- A developer can replace logo, colors, labels, text, links, and approved asset references without rebuilding the world from scratch.
- A full admin dashboard is out of scope for V1.0 unless separately approved.

## 5. Scope and functional requirements
Priority definitions: **P0** required for release; **P1** important; **P2** future enhancement.

### FR-01 — Initial loading and entry (P0)
- Show a branded loading state while the 3D scene initializes.
- Display loading progress where feasible.
- Provide an “Enter Office” / “Explore” action.
- Handle WebGL unavailable or scene-load failure with a clear fallback message and contact link.
- Do not trap users in a loading screen indefinitely.

### FR-02 — Main 3D campus scene (P0)
- Present a stylized isometric environment with an office building or connected building group.
- Include exterior paths, landscaping, entrance, windows/walls, and visible interior cutaways.
- Include representative office spaces: reception, open workspace, meeting room, and executive/team area.
- Provide stable lighting, shadows where affordable, readable materials, and consistent art direction.
- Keep scene scale consistent so characters and props look proportionate.

### FR-03 — Character movement (P0)
- Desktop: WASD and arrow keys move the character; movement must be responsive and bounded by walkable areas.
- Character cannot walk through walls, furniture, or outside the designed world.
- Character faces the direction of movement and uses an idle/walk animation if suitable assets are available.
- Movement speed, collision radius, and acceleration are configurable.
- Camera follows or frames the character without excessive jitter.
- Stop movement while a modal/panel is actively capturing keyboard input.

### FR-04 — Camera exploration (P0)
- Support pan/orbit/zoom appropriate to the chosen isometric presentation.
- Provide a clear reset-to-overview action.
- Camera movement must be eased and must not clip through walls or zoom below/inside the floor.
- Offer camera transitions to key destinations.
- Character movement and camera controls must not conflict unpredictably.

### FR-05 — Click-to-navigate (P0)
- Click a walkable location or destination marker to move the character there, or to trigger a camera transition where appropriate.
- Click named destinations such as Reception, Meeting Room, Team Area, and Projects.
- Show a visual destination/selection cue.
- Cancel or replace the current destination when a new one is selected.
- If a full pathfinding system is too costly for the first iteration, use authored walkable paths/waypoints rather than unreliable straight-line movement.

### FR-06 — Selectable objects and information (P0)
- Interactive objects must be registered with stable IDs and content records.
- Selecting an object opens a contextual card with a title, description, and optional image/link/action.
- Examples: reception explains the company; meeting room offers booking; team member shows a role; project wall opens a case study.
- Selected objects should have a clear highlight or response.
- Panels must be dismissible by close button and Escape.
- UI clicks must not accidentally trigger scene movement underneath.

### FR-07 — Navigation and orientation (P0)
- Provide a compact destination list or mini-map/navigation panel.
- Show current location or selected destination.
- Provide “Overview” and “Return to entrance” actions.
- Offer a short first-visit hint for movement and selection.
- Do not rely on hidden gestures alone.

### FR-08 — Business conversion (P0)
- Include company profile, services, selected work/projects, and contact/meeting action.
- Contact form fields: name, email, optional company, message, and consent where required.
- Validate fields and show success/error states.
- V1.0 can submit to a configured endpoint or open a configured email/contact URL; do not fake successful server submission.
- External links open safely and are clearly identified.

### FR-09 — Responsive and touch controls (P0)
- Desktop keyboard/mouse is the primary experience.
- Touch devices show an on-screen movement joystick or equivalent and visible camera/selection controls.
- Ensure panels fit narrow screens and remain readable.
- Provide a reduced-quality graphics option or automatic quality tier.
- If mobile 3D performance is insufficient, offer a simplified scene or accessible 2D navigation fallback.

### FR-10 — Accessibility and usability (P0)
- All essential company information and contact actions must also be available through conventional HTML UI.
- Buttons and panels have accessible labels and keyboard focus behavior.
- Respect reduced-motion preferences for UI/camera transitions where practical.
- Do not communicate selection using color alone.
- Provide a non-3D fallback for essential content.

### FR-11 — Analytics and privacy (P1)
- Track only approved, privacy-conscious events such as enter experience, destination selected, info card opened, and enquiry submitted.
- Do not collect unnecessary movement traces or personal data.
- Any analytics must follow the client's consent and privacy requirements.

### FR-12 — Content customization (P1)
- Keep editable text, destinations, object IDs, links, brand colors, and contact settings in typed configuration/data files.
- Use reusable scene components and asset manifests.
- Document asset replacement conventions.

## 6. Information architecture
- Entry/loading state
- Main 3D campus
  - Entrance / Reception
  - Open workspace
  - Meeting room
  - Team / department area
  - Projects / portfolio wall
  - Executive or company story area
- Contextual information panel
- Services / project details
- Contact / meeting enquiry
- Help / controls
- Error and fallback states

## 7. Acceptance criteria
A release candidate is acceptable when:
1. The main scene loads and has a clear entry/overview state.
2. A desktop user can move the character with WASD/arrow keys in the intended walkable space.
3. Collision prevents walking through major walls and furniture.
4. Camera orbit/pan/zoom and reset work without breaking the scene.
5. Clicking destinations triggers reliable navigation.
6. At least five distinct objects/areas open the correct contextual information.
7. Panels can be closed, and keyboard controls do not leak through an open panel.
8. Contact actions work and accurately report success/failure.
9. A touch device has visible movement/navigation controls or a documented 2D fallback.
10. The application handles unsupported WebGL, failed assets, and loading errors gracefully.
11. No known P0 console errors remain; core journey passes on target browsers.
12. A developer can replace text, logo, links, and configured asset references using the documented content configuration.

## 8. Quality targets
These are engineering targets to validate on real hardware, not guarantees:
- Initial interactive experience target: under 8 seconds on a typical broadband desktop after caching strategy is considered.
- Aim for stable 30 FPS on a mid-range supported device; target 60 FPS on capable desktop hardware.
- Keep initial download and texture memory reasonable; lazy-load optional assets.
- Avoid long main-thread tasks and unnecessary React state updates per frame.
- Core UI should remain responsive even when 3D rendering quality is reduced.

## 9. Risks and mitigations
- **Heavy 3D scene:** optimize geometry/textures, instance repeated props, lazy-load assets, use quality tiers.
- **Movement feels wrong:** prototype camera and movement early; use collision/waypoint tests.
- **Camera and character controls conflict:** define explicit input modes and test combinations.
- **Asset licensing:** maintain a manifest of source, license, and modifications for every third-party asset.
- **Mobile overheating/battery use:** reduce shadows, pixel ratio, post-processing, and scene detail.
- **3D blocks access to content:** keep essential information and contact actions in HTML fallback UI.
- **Unrealistic scope:** lock V1.0 scene and interaction count; move multiplayer, AI, and admin CMS to later versions.

## 10. V1.0 release definition
V1.0 is a polished single-company demo with one coherent office/campus, one controllable character, camera controls, destination navigation, at least five interactive content points, working contact action, desktop support, and a usable mobile/fallback path.
