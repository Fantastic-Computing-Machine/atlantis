#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { buildSearchVector } = require('./searchVector');
const { resolveDatabaseUrl, sqlitePathFromUrl } = require('./database-url');

// Try to load .env if present
try {
  require('dotenv').config();
} catch (err) {
  if (err && typeof err === 'object') {
    // dotenv not installed; ignore
  }
}

const root = process.cwd();
const lifecycle = process.env.npm_lifecycle_event;
const isProd = process.env.NODE_ENV === 'production';
const isCI = process.env.CI === 'true';
const isDevScript = lifecycle === 'dev';
const autoApplyEnv = process.env.PRISMA_AUTO_APPLY;
const skipAutoPush = process.env.PRISMA_SKIP_AUTOPUSH === 'true';
const forceGenerate = process.env.PRISMA_FORCE_GENERATE === 'true';
const shouldAutoApply =
  autoApplyEnv === 'true' || (autoApplyEnv !== 'false' && isDevScript && !isCI && !isProd);
const shouldGenerate = forceGenerate || !isProd;

function run(cmd, args, options = {}) {
  console.log(`[bootstrap] running: ${cmd} ${args.join(' ')}`);

  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env },
    ...options,
  });
  if (result.status !== 0) {
    console.error(`[bootstrap] failed at ${cmd}`);
    process.exit(result.status ?? 1);
  }
}

function ensureDataDir(url) {
  if (!url || !url.startsWith('file:')) return;
  const filePath = sqlitePathFromUrl(url);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createAdapter(url) {
  if (url.startsWith('file:')) {
    ensureDataDir(url);
    try {
      // Optional dependency in some builds
      const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
      return new PrismaBetterSqlite3({ url });
    } catch (err) {
      if (err?.code !== 'MODULE_NOT_FOUND') throw err;
      return undefined;
    }
  }
  if (url.startsWith('postgres')) {
    try {
      const { PrismaPg } = require('@prisma/adapter-pg');
      return new PrismaPg({ connectionString: url });
    } catch (err) {
      if (err?.code !== 'MODULE_NOT_FOUND') throw err;
      return undefined;
    }
  }
  return undefined;
}

async function backfillSearchVectors(url) {
  if (process.env.PRISMA_SKIP_BACKFILL === 'true') return;

  const adapter = createAdapter(url);
  if (!adapter) {
    console.warn('[bootstrap] skipping backfill; no Prisma adapter available');
    return;
  }
  const { PrismaClient } = require('@prisma/client');
  const client = new PrismaClient(adapter ? { adapter } : {});

  try {
    const batchSize = 500;
    while (true) {
      const batch = await client.diagram.findMany({
        where: { searchVector: '' },
        take: batchSize,
        include: { contents: { orderBy: { updatedAt: 'desc' }, take: 1 } },
      });

      if (batch.length === 0) break;

      for (const diagram of batch) {
        const latestContent = diagram.contents[0]?.content ?? '';
        const vector = buildSearchVector(diagram.title, '', latestContent);
        if (vector === (diagram.searchVector ?? '')) continue;
        await client.diagram.update({ where: { id: diagram.id }, data: { searchVector: vector } });
      }
    }
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  const url = ensureDatabaseUrl();
  const isSqlite = url.startsWith('file:');
  const sqliteNeedsPush = isSqlite && needsSqliteDbPush(url);

  // Step 1: ensure provider-substituted schema
  run('node', ['scripts/prepare-prisma-schema.js']);

  // Step 2: generate client (skip in prod unless forced)
  if (shouldGenerate) {
    run('node', ['./node_modules/prisma/build/index.js', 'generate']);
  }

  // Step 3: apply schema to DB
  // Always push for SQLite if database file is missing or empty (ensures tables exist)
  // Also push in dev mode or when explicitly enabled
  if (!skipAutoPush && (shouldAutoApply || sqliteNeedsPush)) {
    run('node', ['./node_modules/prisma/build/index.js', 'db', 'push']);
  }

  // Step 3.5: backfill tag usage counts and note todos (idempotent)
  // We run this after db push ensures schema exists.
  if (isSqlite) {
    run('node', ['scripts/backfill-tag-counts.js']);
  }

  // Step 4: backfill search vectors for legacy rows (idempotent)
  await backfillSearchVectors(url);
}

/**
 * Check if SQLite database needs a push (missing or very small file = no tables)
 */
function needsSqliteDbPush(url) {
  const filePath = sqlitePathFromUrl(url);
  try {
    const stats = fs.statSync(filePath);
    // SQLite header is 100 bytes; an empty schema db is typically ~12KB+
    // If file is tiny or missing, we need to push
    return stats.size < 1000;
  } catch {
    // File doesn't exist
    return true;
  }
}

function ensureDatabaseUrl() {
  const url = resolveDatabaseUrl();
  ensureDataDir(url);
  return url;
}

main().catch((err) => {
  console.error('[bootstrap] failed', err);
  process.exit(1);
});
