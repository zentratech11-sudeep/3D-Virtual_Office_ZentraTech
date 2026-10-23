# Corporate Virtual Office — Technical Requirements Document (TRD)
**Version:** 1.0  
**Companion document:** `Corporate_Virtual_Office_PRD_v1.0.md`

## 1. Recommended stack
- **Framework:** Next.js (App Router) + React + TypeScript
- **3D rendering:** Three.js through React Three Fiber (`@react-three/fiber`)
- **3D utilities:** `@react-three/drei`
- **UI styling:** Tailwind CSS
- **UI animation:** CSS transitions or Framer Motion for interface elements; use a 3D-aware animation approach for scene/camera motion
- **Character animation:** GLTF/GLB animations; `@react-three/rapier` for physics/collision if the prototype demonstrates it is needed
- **Validation:** Zod for forms and configuration validation where useful
- **Testing:** Vitest or Jest for utilities; Playwright for browser journeys; manual performance checks on real devices
- **Hosting:** Any compatible Node/Next.js host with HTTPS and asset caching; static 3D assets can be served from the public asset directory or a CDN

Do not add a database, authentication, Redis, or admin CMS until a confirmed V1.0 requirement needs them.

## 2. System architecture
### Application shell
Next.js renders the accessible HTML shell, metadata, loading/error states, navigation, contact form, and contextual panels.

### 3D scene
A client-only React Three Fiber scene owns rendering, camera, lights, environment, character, collision surfaces, and selectable objects. Load the 3D scene dynamically so the server-rendered shell does not import browser-only WebGL code.

### Interaction controller
A small state machine coordinates:
- `loading`
- `intro`
- `overview`
- `walking`
- `cameraTransition`
- `objectSelected`
- `panelOpen`
- `errorFallback`

Use one source of truth for interaction mode. Disable movement input when a form or modal is focused.

### Content layer
Keep content separate from the 3D meshes. Scene objects reference stable IDs; typed data records supply titles, descriptions, links, images, and action types. This allows text and links to change without rewriting scene code.

### Contact integration
Use a server route only if the project needs secure email delivery or backend persistence. Validate all input server-side, protect against spam, and store secrets in environment variables. If no backend is included, use a clearly configured mailto/external booking link and document its limitations.

## 3. Suggested project structure
```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    api/
      contact/route.ts          # optional, only if configured
  components/
    experience/
      VirtualOfficeExperience.tsx
      SceneCanvas.tsx
      OfficeWorld.tsx
      OfficeBuilding.tsx
      Room.tsx
      InteractiveObject.tsx
      CharacterController.tsx
      CameraRig.tsx
      CollisionWorld.tsx
      DestinationMarkers.tsx
      TouchControls.tsx
    interface/
      ExperienceShell.tsx
      LoadingScreen.tsx
      ControlsHelp.tsx
      DestinationPanel.tsx
      InfoPanel.tsx
      ContactForm.tsx
      ErrorFallback.tsx
  config/
    office.ts
    destinations.ts
    interactions.ts
  data/
    company-content.ts
  hooks/
    useExperienceMode.ts
    useKeyboardControls.ts
    useDeviceQuality.ts
  lib/
    validation.ts
    contact.ts
  types/
    experience.ts
public/
  models/
    architecture/
    characters/
    furniture/
    props/
  textures/
  images/
  audio/                         # optional
docs/
  Corporate_Virtual_Office_PRD_v1.0.md
  Corporate_Virtual_Office_TRD_v1.0.md
```
Adapt the exact structure to the repository's existing conventions; do not duplicate folders if equivalent components already exist.

## 4. Core data contracts
Example conceptual types (adjust during implementation):

```ts
type Destination = {
  id: string;
  label: string;
  position: [number, number, number];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  waypointIds?: string[];
};

type InteractionContent = {
  id: string;
  kind: "room" | "person" | "object" | "project" | "service";
  title: string;
  description: string;
  image?: string;
  action?: { label: string; type: "internal" | "external" | "contact"; href?: string };
};

type ExperienceMode =
  | "loading"
  | "intro"
  | "overview"
  | "walking"
  | "cameraTransition"
  | "objectSelected"
  | "panelOpen"
  | "errorFallback";
```

Requirements:
- IDs are stable, unique, and not derived from visible labels.
- All external URLs are validated and restricted to safe protocols.
- Content references a valid asset/object ID.
- Content configuration should fail visibly in development if required fields are missing.

## 5. Scene and asset requirements
### Visual design
- Isometric or near-isometric camera with perspective selected after a visual prototype.
- Stylized game-like materials, controlled palette, readable silhouettes, consistent scale.
- Use cutaway walls/roof visibility or open-front architecture so interiors remain visible.
- Art direction should be cohesive; avoid mixing photorealistic assets with cartoon assets unless deliberately stylized to match.

### Asset policy
- Prefer GLB/GLTF for runtime models.
- Reuse repeated chairs, desks, plants, computers, and lamps through instancing or shared geometry/materials.
- Use custom models for the primary building silhouette, recognizable reception, branded signage, and any hero character where necessary.
- Optimize meshes and textures before integration.
- Record attribution/license in `public/models/ASSET_LICENSES.md` or an equivalent manifest.
- Do not use assets whose license prohibits commercial deployment or modification if the website is intended for sale.

### Scene partitioning
- Divide the campus into logical groups (exterior, reception, workspace, meeting room, project area).
- Lazy-load optional/high-detail groups when practical.
- Use stable IDs on interactive meshes or parent groups.
- Avoid attaching a separate high-cost event handler to every tiny decorative mesh; use a centralized selection strategy where practical.

## 6. Character movement and collision
- Use a fixed or semi-fixed isometric camera as the default view.
- Normalize diagonal input so diagonal movement is not faster.
- Apply delta time to movement so speed is not frame-rate dependent.
- Use collision shapes for walls, major furniture, and world boundaries.
- Keep character feet aligned with the walkable surface.
- For click-to-move, use authored waypoints first; introduce navmesh/pathfinding only if the layout requires it.
- Separate character input from camera input, and define when mouse drag means camera orbit vs selecting an object.
- Add idle/walk animation blending if the chosen rig provides compatible clips.
- Provide configurable speed and collision dimensions.

## 7. Camera and selection
- Camera controller exposes named destinations and an overview target.
- Use eased interpolation for transitions and prevent camera target/position from passing through geometry where feasible.
- Clamp zoom and orbit angles to maintain the intended composition.
- Use raycasting for selectable objects; resolve child-mesh hits to a registered interaction ID.
- On selection, show a highlight and open the corresponding HTML panel.
- Stop pointer events from bubbling from the panel into the canvas.
- Close selection with Escape and restore focus to a meaningful UI element.

## 8. Performance strategy
- Use `frameloop="demand"` only if the scene can tolerate event-driven rendering; otherwise use continuous rendering with careful profiling.
- Set a capped device pixel ratio; reduce it on mobile/low-power devices.
- Prefer baked lighting or restrained real-time shadows over many dynamic lights.
- Use compressed textures and geometry where pipeline support is practical.
- Reuse materials and geometries; instance repeated props.
- Limit transparent materials, expensive post-processing, and large shadow maps.
- Load core assets first; lazy-load optional details and animations.
- Pause or reduce rendering when the tab is hidden if supported by the chosen setup.
- Test with browser performance tools on an actual lower/mid-range device; do not rely on developer workstation FPS.

## 9. Responsive and accessibility requirements
- Desktop: keyboard movement, mouse selection, camera controls, destination navigation.
- Mobile/tablet: on-screen joystick or tap-to-move, visible rotate/zoom controls, large touch targets.
- UI content remains readable independent of the canvas.
- Honor reduced-motion preferences for non-essential UI/camera movement.
- Use semantic buttons and forms, visible focus indicators, accessible names, and sensible focus management.
- Ensure essential company/service/contact content remains accessible if WebGL fails.

## 10. Security and privacy
- Do not put API keys, SMTP credentials, or private tokens in client bundles.
- Validate contact form data on the server if a server endpoint is used.
- Add rate limiting and spam protection appropriate to the deployment.
- Sanitize or safely render content; avoid injecting arbitrary HTML.
- Validate external URLs and use safe link attributes.
- Collect only necessary analytics and disclose them according to client policy.
- Audit third-party model, texture, font, and audio licenses before commercial launch.

## 11. Test plan
### Unit/component tests
- Content configuration validation and unique IDs.
- Destination lookup and state transitions.
- Form validation and safe URL checks.
- Input mode behavior and modal keyboard handling.

### End-to-end tests
- Loading -> enter experience.
- Character moves and respects world boundaries.
- Destination selection transitions to expected location.
- Selecting at least five interactive targets shows the correct content.
- Panel close/Escape works and canvas does not receive unintended clicks.
- Contact validation and configured submission/error states work.
- Unsupported WebGL or asset-load failure shows a usable fallback.
- Mobile controls are visible and actionable at a narrow viewport.

### Manual visual/performance checks
- Chrome and Edge desktop; Safari/iOS and Android browser where available.
- Low/mid-range device quality and frame pacing.
- Camera clipping, character scale, collision edges, text readability, and scene-loading behavior.
- Reduced-motion and keyboard-only checks.

## 12. Implementation roadmap
### Phase 0 — Repository and feasibility audit
- Inspect existing project structure, framework versions, build scripts, and design assets.
- Confirm target hosting and contact destination.
- Create a short asset/licensing inventory.
- Produce a written gap analysis before modifying files.

### Phase 1 — Greybox prototype
- Build one small scene: entrance, reception, one office room, one character, simple furniture.
- Establish isometric camera, WASD movement, collision, selection, and one camera transition.
- Test movement/camera conflicts and performance.
- Do not build the whole campus before this prototype feels good.

### Phase 2 — Core world and interactions
- Add remaining V1.0 spaces, repeated props, character animation, waypoint navigation, object IDs, and contextual panels.
- Add destination menu and overview/reset behavior.

### Phase 3 — Website UI and conversion
- Add loading/intro screen, help, responsive interface, service/project content, contact/meeting action, and fallback states.
- Connect the optional contact endpoint only after its delivery method is confirmed.

### Phase 4 — Optimization and QA
- Optimize models/textures, implement device quality tiers, test keyboard/touch interactions, verify asset licenses, and run E2E tests.
- Test on actual target hardware and resolve P0 issues.

### Phase 5 — Release and handoff
- Document setup, environment variables, build/deploy commands, content editing, asset replacement, and known limitations.
- Deliver source code, asset-license manifest, test report, and deployment notes.

## 13. Definition of done
- PRD acceptance criteria are met.
- Production build succeeds without known P0 errors.
- Core desktop journey and mobile/fallback journey are tested.
- No placeholder contact action falsely claims to submit data.
- Third-party asset licenses are documented.
- Content customization and deployment instructions are included.
