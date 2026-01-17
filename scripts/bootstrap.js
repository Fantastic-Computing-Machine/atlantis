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

function main() {
  ensureDataDir();

  // Step 1: ensure provider-substituted schema
  run('node', ['scripts/prepare-prisma-schema.js']);

  // Step 2: generate client
  run('npx', ['prisma', 'generate']);

  // Step 3: apply schema to DB in dev (or when explicitly enabled)
  if (!skipAutoPush && shouldAutoApply) {
    run('npx', ['prisma', 'db', 'push', '--skip-generate']);
  }
}

main();
