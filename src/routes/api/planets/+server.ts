import { prisma } from '$lib/server/prisma';
import { ensurePlanetTable } from '$lib/server/db-init';
import { json } from '@sveltejs/kit';

const PLANETS_PER_RING = 20;
const DEFAULT_COLORS = ['#7dd3fc', '#fde68a', '#fda4af', '#86efac', '#c4b5fd', '#f9a8d4'];

const normalizeName = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const name = value.trim().slice(0, 48);
	return name.length > 0 ? name : null;
};

const normalizeColor = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const color = value.trim();
	return /^#([0-9a-f]{6})$/i.test(color) ? color : null;
};

const normalizeNumber = (value: unknown, fallback: number, min: number, max: number) => {
	if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
	return Math.min(max, Math.max(min, value));
};

export const GET = async () => {
	await ensurePlanetTable();
	const planets = await prisma.planet.findMany({
		orderBy: [{ orbitRing: 'asc' }, { slot: 'asc' }]
	});

	return json({ planets });
};

export const POST = async ({ request }) => {
	await ensurePlanetTable();
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json({ error: 'Invalid JSON payload.' }, { status: 400 });
	}

	const name = normalizeName((body as Record<string, unknown>).name) ?? `Planet-${Date.now()}`;
	const color =
		normalizeColor((body as Record<string, unknown>).color) ??
		DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
	const size = normalizeNumber((body as Record<string, unknown>).size, 3.4, 1.8, 8.5);
	const speed = normalizeNumber((body as Record<string, unknown>).speed, 0.24, 0.05, 1.2);

	const totalPlanets = await prisma.planet.count();
	const orbitRing = Math.floor(totalPlanets / PLANETS_PER_RING);
	const slot = totalPlanets % PLANETS_PER_RING;

	try {
		const planet = await prisma.planet.create({
			data: { name, color, size, speed, orbitRing, slot }
		});
		return json({ planet }, { status: 201 });
	} catch {
		return json({ error: 'Failed to persist planet.' }, { status: 500 });
	}
};
