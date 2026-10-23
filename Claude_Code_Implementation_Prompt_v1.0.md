# Claude Code Implementation Prompt — Corporate Virtual Office V1.0

You are the senior Three.js / React Three Fiber engineer responsible for implementing Corporate Virtual Office V1.0 from the accompanying PRD and TRD.

## First: inspect, do not blindly overwrite
1. Inspect the existing repository, package.json, source structure, build/test commands, current UI, and available assets.
2. Read `Corporate_Virtual_Office_PRD_v1.0.md` and `Corporate_Virtual_Office_TRD_v1.0.md` completely.
3. Write a short implementation plan identifying existing reusable code, dependencies to add, risks, and files to create/change.
4. Do not delete or rewrite unrelated features. Do not run destructive commands or deploy anything without explicit approval.
5. If the repository differs from the proposed structure, adapt to its conventions and explain the mapping.

## Required experience
Implement a genuine real-time 3D browser experience—not a video, static screenshot, or decorative canvas.

- Stylized, game-like isometric office campus with visible/cutaway interiors.
- Hybrid asset strategy: use commercially compatible prebuilt assets where suitable and create simple custom geometry for unique architecture/signage where needed.
- Character movement using WASD and arrow keys on desktop.
- Camera orbit/pan/zoom with clear bounds and reset-to-overview.
- Click-to-destination navigation using reliable authored waypoints for V1.0.
- Collision against major walls/furniture/world boundaries.
- At least five selectable interaction points, each linked by stable ID to typed content data.
- HTML information panels that open for selected rooms/people/objects and close via button/Escape.
- Input handling that prevents movement while typing or interacting with panels.
- Destination navigation/help UI, intro/loading state, and clear fallback when WebGL or assets fail.
- Responsive touch controls or a documented functional 2D fallback.
- Company services/projects/contact actions using configurable content.
- Do not claim a contact form succeeded unless it actually submitted to a configured endpoint.

## Engineering constraints
- Use the project's existing framework if it is already compatible; otherwise use Next.js App Router, TypeScript, React Three Fiber, Drei, and Tailwind.
- Load browser-only WebGL components client-side/dynamically.
- Keep content data separate from meshes and UI components.
- Use typed stable IDs, reusable components, and centralized input/experience state.
- Optimize geometry, textures, shadows, pixel ratio, and repeated props. Profile rather than guessing.
- Keep API keys and secrets server-side.
- Record third-party asset sources and licenses. Do not use assets that are incompatible with commercial use.
- Avoid adding database/auth/CMS/multiplayer/AI unless explicitly requested.
- Respect accessibility and reduced-motion needs; essential company information must remain available outside the 3D canvas.

## Workflow
1. Audit and report findings.
2. Implement a small greybox prototype first: character, camera, collision, one room, one selectable object.
3. Run build and relevant tests. Fix issues before expanding the world.
4. Expand the scene and interactions to the V1.0 acceptance criteria.
5. Add UI, contact actions, mobile controls/fallback, error handling, and performance tiers.
6. Run unit/E2E tests and manual checks. Report exactly what passed, failed, or was not testable.
7. Update documentation, setup instructions, content customization instructions, and asset license manifest.

## Required completion report
Provide:
- Summary of implemented behavior.
- Files added/changed.
- Dependencies added and why.
- Commands run and actual test/build results.
- Known limitations and untested areas.
- Performance observations and device/browser coverage.
- How to run locally and customize the company content.
- Any decisions requiring owner approval.

Do not merely create a visual mockup and call it complete. The movement, camera, selection, panels, fallback, and contact behavior must be implemented and tested.
