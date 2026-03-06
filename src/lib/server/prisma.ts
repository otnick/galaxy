import { PrismaClient } from '@prisma/client';

const prismaClient = () =>
	new PrismaClient({
		log: ['warn', 'error']
	});

const globalForPrisma = globalThis as unknown as {
	prisma: ReturnType<typeof prismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClient();

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma;
}
