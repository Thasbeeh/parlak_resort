import { PrismaClient } from '@prisma/client';

/**
 * Global singleton pattern for PrismaClient.
 * 
 * In serverless environments (like Next.js on Vercel or Node during dev hot-reloading),
 * multiple client instances can quickly exhaust the PostgreSQL connection pool.
 * Attaching the instance to `globalThis` preserves a single reusable connection client.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Export both db and prisma aliases for universal consistency
export const prisma = db;
export default db;
