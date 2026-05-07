import { accessSync, constants, existsSync, mkdirSync } from 'fs';
import os from 'os';
import path from 'path';

const defaultSqlitePath = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  'data',
  'atlantis.db'
);
const fallbackSqlitePath = path.join(os.tmpdir(), 'atlantis', 'atlantis.db');

function ensureDir(dirPath: string): void {
  try {
    mkdirSync(dirPath, { recursive: true });
  } catch {
    // noop
  }
}

function isWritablePath(filePath: string): boolean {
  const dir = path.dirname(filePath);
  ensureDir(dir);

  try {
    accessSync(dir, constants.W_OK);
    if (existsSync(filePath)) {
      accessSync(filePath, constants.W_OK);
    }
    return true;
  } catch {
    return false;
  }
}

export function sqlitePathFromUrl(url: string): string {
  const withoutPrefix = url.replace(/^file:/, '');
  const withoutQuery = withoutPrefix.split(/[?#]/)[0];
  if (path.isAbsolute(withoutQuery)) return withoutQuery;
  return path.join(/* turbopackIgnore: true */ process.cwd(), withoutQuery);
}

function resolveSqlitePath(): string {
  const candidates = [defaultSqlitePath, fallbackSqlitePath];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (isWritablePath(candidate)) return candidate;
    console.warn(`[database-url] path not writable, skipping: ${candidate}`);
  }

  ensureDir(path.dirname(fallbackSqlitePath));
  return fallbackSqlitePath;
}

export function resolveDatabaseUrl(): string {
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
