import fs from 'fs';
import { mkdirSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function resolveDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? process.env.DB_CONNECTION ?? 'file:./data/atlantis.db';
}

function ensureDataDir(url: string) {
  if (!url.startsWith('file:')) return;
  const filePath = url.replace('file:', '');
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });
}

function createAdapter(url: string) {
  if (url.startsWith('file:')) {
    ensureDataDir(url);
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

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
