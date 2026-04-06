import {
  resolveDatabaseUrl as resolveDatabaseUrlJs,
  sqlitePathFromUrl as sqlitePathFromUrlJs,
} from '../../scripts/database-url';

export function resolveDatabaseUrl(): string {
  return resolveDatabaseUrlJs();
}

export const sqlitePathFromUrl: (url: string) => string = sqlitePathFromUrlJs;
