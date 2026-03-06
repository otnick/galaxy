import { prisma } from '$lib/server/prisma';

let initPromise: Promise<void> | null = null;

export const ensurePlanetTable = async () => {
	if (initPromise) return initPromise;

	initPromise = (async () => {
		await prisma.$executeRawUnsafe(`
			CREATE TABLE IF NOT EXISTS "Planet" (
				"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
				"name" TEXT NOT NULL,
				"color" TEXT NOT NULL,
				"size" REAL NOT NULL,
				"speed" REAL NOT NULL,
				"orbitRing" INTEGER NOT NULL,
				"slot" INTEGER NOT NULL,
				"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
			);
		`);

		await prisma.$executeRawUnsafe(
			'CREATE UNIQUE INDEX IF NOT EXISTS "Planet_orbitRing_slot_key" ON "Planet"("orbitRing", "slot");'
		);
	})();

	return initPromise;
};
