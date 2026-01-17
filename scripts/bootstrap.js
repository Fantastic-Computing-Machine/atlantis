#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try to load .env if present
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require('dotenv').config();
} catch (_) {
  // dotenv not installed; ignore
}

const root = process.cwd();
const lifecycle = process.env.npm_lifecycle_event;
const isProd = process.env.NODE_ENV === 'production';
const isCI = process.env.CI === 'true';
const isDevScript = lifecycle === 'dev';
const autoApplyEnv = process.env.PRISMA_AUTO_APPLY;
const skipAutoPush = process.env.PRISMA_SKIP_AUTOPUSH === 'true';
const shouldAutoApply =
  autoApplyEnv === 'true' ||
  (autoApplyEnv !== 'false' && isDevScript && !isCI && !isProd);

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env },
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureDataDir() {
  const url = process.env.DATABASE_URL || process.env.DB_CONNECTION;
  if (!url || !url.startsWith('file:')) return;
  const filePath = url.replace('file:', '');
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function buildSearchVector(title, content) {
  return `${title} ${content}`.toLowerCase();
}

function createAdapter(url) {
  if (url.startsWith('file:')) {
    ensureDataDir();
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
    return new PrismaBetterSqlite3({ url });
  }
  if (url.startsWith('postgres')) {
    const { PrismaPg } = require('@prisma/adapter-pg');
    return new PrismaPg({ connectionString: url });
  }
  return undefined;
}

async function backfillSearchVectors(url) {
  if (process.env.PRISMA_SKIP_BACKFILL === 'true') return;

  const adapter = createAdapter(url);
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client');
  const client = new PrismaClient(adapter ? { adapter } : {});

  try {
    // Only diagrams missing searchVector
    // Batch to avoid long locks
    const batchSize = 500;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = await client.diagram.findMany({
        where: { OR: [{ searchVector: '' }, { searchVector: null }] },
        take: batchSize,
        include: { contents: { orderBy: { updatedAt: 'desc' }, take: 1 } },
      });

      if (batch.length === 0) break;

      for (const diagram of batch) {
        const latestContent = diagram.contents[0]?.content ?? '';
        const vector = buildSearchVector(diagram.title, latestContent);
        if (vector === (diagram.searchVector ?? '')) continue;
        await client.diagram.update({ where: { id: diagram.id }, data: { searchVector: vector } });
      }
    }
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  ensureDataDir();

  // Step 1: ensure provider-substituted schema
  run('node', ['scripts/prepare-prisma-schema.js']);

  // Step 2: generate client
  run('npx', ['prisma', 'generate']);

  // Step 3: apply schema to DB in dev (or when explicitly enabled)
  if (!skipAutoPush && shouldAutoApply) {
    run('npx', ['prisma', 'db', 'push', '--skip-generate']);
  }

  // Step 4: backfill search vectors for legacy rows (idempotent)
  const url = process.env.DATABASE_URL || process.env.DB_CONNECTION || 'file:./data/atlantis.db';
  await backfillSearchVectors(url);
}

main().catch((err) => {
  console.error('[bootstrap] failed', err);
  process.exit(1);
});
