# AGENTS.md — Project instructions for Codex

## Goal
Build a portfolio website where the landing page is an interactive solar system.
Users can enter their name, which becomes a planet orbiting the sun permanently.

The site also functions as a personal developer portfolio.

---

## Tech Stack
- SvelteKit (TypeScript)
- Canvas 2D (solar system rendering)
- Server endpoints in SvelteKit
- Persistence: Prisma + SQLite (preferred)
- Styling: TailwindCSS
- UI Style: Liquid Glass (modern glassmorphism with depth, blur, glow)

---

## Visual Design — Liquid Glass Style

The UI must follow a “Liquid Glass” aesthetic:

- Frosted glass panels
- backdrop-blur
- translucent gradients
- subtle light refractions
- soft glowing edges
- smooth animations (opacity, blur, float)
- radial gradients for light sources
- no harsh borders
- layered depth using shadow + blur

Color palette:
- Deep space background (#050510 – #0d0d1f gradient)
- Soft blue / purple glow accents
- Sun: warm yellow/orange radial glow
- UI glass: rgba(255,255,255,0.08–0.15)

Use:
- backdrop-filter: blur()
- soft inner shadows
- animated light shimmer (subtle)

---

## Structure

### Landing Page (/)
- Fullscreen canvas
- Sun in center
- Orbiting planets (user names)
- Minimal glass input panel to add name
- Small floating glass navigation panel

### Portfolio Sections
Add additional routes:

- /about
- /projects
- /contact

All pages:
- Glass cards
- Smooth transitions
- Maintain space theme

Navigation:
- Floating glass navbar
- Smooth page transitions
- Subtle fade/blur transitions between routes

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

- Use deltaTime-based animation
- 60fps target
- Keep animation smooth even with 300+ planets
- Avoid expensive re-renders in Svelte
- Only Canvas handles animation loop

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
