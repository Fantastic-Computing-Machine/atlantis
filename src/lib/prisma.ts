import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function resolveDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? process.env.DB_CONNECTION ?? 'file:./data/atlantis.db';
}

function ensureDataDir(url: string) {
  if (!url.startsWith('file:')) return;
  const filePath = url.replace('file:', '');
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function shouldAutoApply(): boolean {
  const raw = (process.env.PRISMA_AUTO_APPLY ?? (process.env.NODE_ENV === 'production' ? 'false' : 'true')).toLowerCase();
  return raw !== 'false';
}

let ensured = false;
function ensurePrismaSchema() {
  if (ensured) return;
  ensured = true;
  const url = resolveDatabaseUrl();
  ensureDataDir(url);

  if (!shouldAutoApply()) return;
  if (process.env.PRISMA_SKIP_AUTOPUSH === 'true') return;

  const result = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });

  if (result.error || result.status !== 0) {
    console.warn('[prisma] db push failed; proceeding without auto-apply');
  }
}

ensurePrismaSchema();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: resolveDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
