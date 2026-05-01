/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const os = require('os');
const path = require('path');

const projectRoots = [process.cwd(), path.resolve(__dirname, '..')];
const defaultSqlitePath = path.join(projectRoots[0], 'data', 'atlantis.db');
const fallbackSqlitePath = path.join(os.tmpdir(), 'atlantis', 'atlantis.db');

function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch {
    /* noop */
  }
}

function isWritablePath(filePath) {
  const dir = path.dirname(filePath);
  ensureDir(dir);

  try {
    fs.accessSync(dir, fs.constants.W_OK);
    if (fs.existsSync(filePath)) {
      fs.accessSync(filePath, fs.constants.W_OK);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a Prisma SQLite URL into an absolute file system path.
 * @param {string} url
 * @returns {string}
 */
function sqlitePathFromUrl(url) {
  const withoutPrefix = url.replace(/^file:/, '');
  const withoutQuery = withoutPrefix.split(/[?#]/)[0];
  if (path.isAbsolute(withoutQuery)) return withoutQuery;
  return path.resolve(process.cwd(), withoutQuery);
}

function resolveSqlitePath() {
  const candidates = projectRoots.map((root) => path.join(root, 'data', 'atlantis.db'));

  candidates.push(fallbackSqlitePath);

  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (isWritablePath(candidate)) return candidate;
    console.warn(`[database-url] path not writable, skipping: ${candidate}`);
  }

  ensureDir(path.dirname(fallbackSqlitePath));
  return fallbackSqlitePath;
}

function resolveDatabaseUrl() {
  const envUrl = process.env.DATABASE_URL || process.env.DB_CONNECTION;
  if (envUrl) {
    process.env.DATABASE_URL = envUrl;
    return envUrl;
  }

  const sqlitePath = resolveSqlitePath();
  const url = `file:${sqlitePath}`;
  process.env.DATABASE_URL = url;
  return url;
}

module.exports = {
  defaultSqlitePath,
  fallbackSqlitePath,
  resolveDatabaseUrl,
  sqlitePathFromUrl,
};
