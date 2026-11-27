# Galaxy

Nick Schumacher's portfolio as an explorable universe. Every star is a section (Orbit, Journey, Projects, Signal, Impressum), every planet a piece of content. There is no classic navigation: you fly between suns, and a retro-futurist cockpit HUD shows the text for whatever you have locked on.

## Features

- Real-time 3D universe with WebGPU (automatic WebGL2 fallback)
- Procedural TSL shaders: stars with coronas, gas giants, lava, ice, rock and ocean worlds with clouds and atmospheres, rings, moons
- 90k-particle spiral galaxy, noise-shaped nebula clouds, baked nebula sky
- Smooth camera flights with warp effect, deep links for every star and planet (`/projects/fusch`)
- Keyboard: `1`–`5` stars, `←`/`→` neighbours, `Esc` zoom out
- Community belt: visitors launch their own planet (`GET/POST /api/planets`, Prisma + SQLite)
- Low-power tier for phones, reduced-motion support, static text fallback without GPU

## Tech Stack

- SvelteKit + TypeScript (Svelte 5)
- Three.js r187 `three/webgpu` + TSL node materials + `RenderPipeline` post-processing
- TailwindCSS, Michroma + VT323 via Fontsource
- Prisma ORM + SQLite

Content lives in `src/lib/universe/content.ts`, the engine in `src/lib/universe/engine/`.

Debug URL params: `?debug=low` (force low-power), `nosky`, `nodust`, `nofog` (combinable, e.g. `?debug=low,nofog`).

## Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Open `http://localhost:5173`.

## Database Notes

- Prisma client is generated from `prisma/schema.prisma`.
- `DATABASE_URL` defaults to `file:./dev.db`.
- The app auto-bootstraps the `Planet` table at runtime (safe `CREATE TABLE IF NOT EXISTS`) before API reads/writes.

## API Examples

Create a planet:

```bash
curl -X POST http://localhost:5173/api/planets \
  -H "content-type: application/json" \
  -d '{"name":"Europa","color":"#7dd3fc","size":3.2,"speed":0.24}'
```

Read all planets:

```bash
curl http://localhost:5173/api/planets
```

## Quality Checks

```bash
npm run lint
npm run check
npm run build
```
