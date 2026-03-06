# Galaxy

Interactive solar-system art project + developer portfolio website built with SvelteKit, TypeScript, TailwindCSS, Prisma, and SQLite.

## Features

- Fullscreen canvas animation with deltaTime-driven orbital motion
- Central sun glow, orbit rings, and persistent planets
- Deterministic orbit assignment (`20` planets per ring, fixed slot spacing)
- Liquid Glass design system:
  - reusable glass panel
  - glow utilities
  - gradient atmospheric background
  - reusable portfolio card
- Floating glass navbar with smooth transitions
- Portfolio routes: `/about`, `/projects`, `/contact`
- API endpoints:
  - `GET /api/planets`
  - `POST /api/planets`
- Prisma + SQLite persistence

## Tech Stack

- SvelteKit + TypeScript
- TailwindCSS (`@tailwindcss/vite`)
- Prisma ORM + SQLite
- Canvas 2D (isolated animation engine, not driven by Svelte reactive frame loops)

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
