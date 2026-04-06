import { mkdirSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolveDatabaseUrl, sqlitePathFromUrl } from '@/lib/database-url';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function resolveProvider(): string {
  if (process.env.DATABASE_URL?.startsWith('postgres')) return 'postgresql';
  if (process.env.DB_CONNECTION === 'postgresql') return 'postgresql';
  return 'sqlite';
}

function createAdapter(url: string) {
  if (url.startsWith('file:')) {
    const filePath = sqlitePathFromUrl(url);
    mkdirSync(path.dirname(filePath), { recursive: true });
    return new PrismaBetterSqlite3({ url: url as ':memory:' | (string & {}) });
  }
  if (url.startsWith('postgres')) {
    return new PrismaPg({ connectionString: url });
  }
  throw new Error(`Unsupported DATABASE_URL for Prisma adapter: ${url}`);
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: createAdapter(resolveDatabaseUrl()),
  });

// Initialize search indexes if running in a server context (not during build)
if (process.env.NODE_ENV !== 'test' && typeof window === 'undefined') {
  // We lazily init this to avoid blocking startup, but import dynamically to avoid cycles if any
  import('./setup-gin-index')
    .then(({ setupGinIndexes }) => {
      setupGinIndexes(resolveProvider());
    })
    .catch((err) => console.error('Failed to init search indexes:', err));
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
