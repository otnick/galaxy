# AGENTS.md — Project instructions for Codex

## Goal
Build a portfolio website where the landing page is an interactive solar system.
Users can enter their name, which becomes a planet orbiting the sun permanently.

The site also functions as a personal developer portfolio.

---

## Tech Stack
- SvelteKit (TypeScript, Svelte 5 runes)
- Three.js `three/webgpu` (WebGPURenderer, automatic WebGL2 fallback)
- TSL node materials for every shader (compile to WGSL and GLSL)
- Post-processing via `THREE.RenderPipeline` (bloom, chromatic aberration on warp, vignette, film grain)
- Server endpoints in SvelteKit, persistence: Prisma + SQLite
- Styling: TailwindCSS import + hand-written tokens in `src/app.css`

---

## Visual Design — Retro-futurist cockpit, minimal HUD

- The page is the view out of a ship's window. The 3D universe is the main surface.
- HUD is line-work and text on the glass. No panels, cards or surfaces unless they hold real text.
- One text screen (phosphor green, VT323, scanlines) for the focused content. Michroma for the ident only.
- Signal orange (`--signal`) marks the active star, back link and lock reticle.
- No glassmorphism, no kicker labels above headings, no unicode glyph icons (use `Icon.svelte`).
- Plenty of nebula and haze in the scene; planets procedurally shaded per kind.

---

## Structure

- All content lives in `src/lib/universe/content.ts` (systems = stars, bodies = planets).
- Routes: `/[[system]]/[[body]]`. The URL is the single source of truth for camera focus.
- `src/lib/universe/engine/` holds the engine (`UniverseEngine.ts`) and TSL materials (`materials.ts`).
- `src/lib/components/Universe.svelte` owns the HUD and syncs the URL to the engine; `ContentPanel.svelte` renders the text screen.
- Navigation: click a star/planet, keys 1–5, arrow keys for siblings, Esc to zoom out, wheel out to the parent level.
- Without WebGPU/WebGL2 a static fallback shows all content as text.

---

## Data Model

Planet:
- id: string (uuid)
- name: string (max 24 chars)
- createdAt: ISO date
- orbitRadius: number
- angle: number
- speed: number

Orbit radius must be deterministic:
- Users grouped in rings (20 per ring)
- Rings evenly spaced
- Speed slightly varied but stable

---

## Animation Rules

- Use deltaTime-based animation, 60fps target
- Keep animation smooth even with 300+ community planets (one InstancedMesh)
- Avoid expensive re-renders in Svelte; only the engine runs the frame loop
- Respect `prefers-reduced-motion`; low-power tier for phones and weak CPUs
- Debug params: `?debug=low`, `nosky`, `nodust`, `nofog`

---

## API Endpoints

GET /api/planets
POST /api/planets

Validation:
- trim
- length 1–24
- reject empty

---

## UX Requirements

- Name input appears as floating glass modal
- On submit:
  - Optimistic UI update
  - Planet appears immediately
- Subtle glow animation when new planet added
- Hover on planet:
  - Show tooltip glass label
  - Show "Orbiting since YYYY"

---

## Performance Constraints

- Must handle 500 planets without freezing
- Use requestAnimationFrame
- Avoid re-rendering entire component tree
- Cache computed positions if necessary

---

## Deliverables

- Working portfolio site
- Solar system landing page
- Persistent planet storage
- README with setup + migration
- Clean, modular code
- Minimal dependencies

---

## Validation Before Finishing

- npm run check
- npm run lint
- npm run test (if tests exist)
- Ensure fresh clone works
