/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = (() => {
  const url = process.env.DATABASE_URL || process.env.DB_CONNECTION;
  if (url && !url.startsWith('file:')) {
    console.error('This script only supports SQLite (file: URLs).');
    process.exit(1);
  }
  if (!url) {
    return path.resolve(__dirname, '../data/atlantis.db');
  }
  // Parse file URL: strip prefix, query params, etc
  const withoutPrefix = url.replace(/^file:/, '');
  const withoutQuery = withoutPrefix.split('?')[0].split('#')[0];
  return path.resolve(process.cwd(), withoutQuery);
})();

console.log(`Using database: ${dbPath}`);

const db = new Database(dbPath);

function main() {
  // Register REGEXP function
  db.function('regexp', (pattern, str) => {
    try {
      return new RegExp(pattern, 'm').test(str) ? 1 : 0;
    } catch {
      return 0;
    }
  });

  console.log('Calculating tag usage counts...');

  // Reset all counts
  db.prepare('UPDATE Tag SET usageCount = 0').run();

  // Update from Diagrams
  try {
    db.prepare(
      `
            UPDATE Tag 
            SET usageCount = usageCount + (
                SELECT COUNT(*) 
                FROM _DiagramToTag 
                WHERE _DiagramToTag.B = Tag.id
            )
        `
    ).run();
  } catch (e) {
    // Table might not exist if no diagrams created yet (prisma implicit tables created on demand?)
    // Actually prisma db push creates all tables.
    console.warn('Could not update from Diagrams:', e.message);
  }

  // Update from Notes
  try {
    db.prepare(
      `
            UPDATE Tag 
            SET usageCount = usageCount + (
                SELECT COUNT(*) 
                FROM _NoteToTag 
                WHERE _NoteToTag.B = Tag.id
            )
        `
    ).run();
  } catch (e) {
    console.warn('Could not update from Notes:', e.message);
  }

  console.log('Updating note todo status...');

  // Regex for Todo: starts with bullet, then [ ], then space, then content
  const todoRegex = String.raw`^\s*[-*+]\s*\[\s\]\s*(.+)$`;

  const result = db
    .prepare(
      `
        UPDATE Note 
        SET hasTodos = regexp(?, content)
    `
    )
    .run(todoRegex);

  console.log(`Updated ${result.changes} notes.`);

  console.log('Backfill complete.');
}

main();
