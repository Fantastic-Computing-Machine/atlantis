/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require('better-sqlite3');
const { resolveDatabaseUrl, sqlitePathFromUrl } = require('./database-url');

const url = resolveDatabaseUrl();

if (!url.startsWith('file:')) {
  console.error('This script only supports SQLite (file: URLs).');
  process.exit(1);
}

const dbPath = sqlitePathFromUrl(url);

console.log(`Using database: ${dbPath}`);

const db = new Database(dbPath);

function hasColumn(tableName, columnName) {
  const safeTable = tableName.replace(/"/g, '""');
  const rows = db.prepare(`PRAGMA table_info("${safeTable}")`).all();
  return rows.some((row) => row.name === columnName);
}

function main() {
  // Register REGEXP function
  db.function('regexp', (pattern, str) => {
    try {
      return new RegExp(pattern, 'm').test(str) ? 1 : 0;
    } catch {
      return 0;
    }
  });

  if (hasColumn('Tag', 'usageCount')) {
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
      // Relationship table may be absent for older installs.
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
  } else {
    console.warn(
      'Skipping usageCount backfill: Tag.usageCount column is missing. Run `prisma db push` to update schema.'
    );
  }

  if (hasColumn('Note', 'hasTodos')) {
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
  } else {
    console.warn(
      'Skipping hasTodos backfill: Note.hasTodos column is missing. Run `prisma db push` to update schema.'
    );
  }

  console.log('Backfill complete.');
}

main();
