import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Use a safe default database URL if none provided (for demo purposes)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://demo:demo@localhost:5432/demo_pickping';
}

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;