/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

function resolveProvider() {
  const raw = (process.env.DATABASE_URL || process.env.DB_CONNECTION || process.env.PRISMA_PROVIDER || '').toLowerCase();
  if (raw.includes('postgres')) return 'postgresql';
  if (raw.includes('mysql')) return 'mysql';
  if (raw.includes('sqlite') || raw.startsWith('file:')) return 'sqlite';
  return 'sqlite';
}

function main() {
  const provider = resolveProvider();
  const templatePath = path.join(__dirname, '..', 'prisma', 'schema.template.prisma');
  const targetPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

  const template = fs.readFileSync(templatePath, 'utf-8');

  let noteIndex = '@@index([searchVector], map: "note_searchVector_idx")';
  let diagramIndex = '@@index([searchVector], map: "diagram_searchVector_idx")';

  if (provider === 'postgresql') {
    // We use GIN indexes for Postgres, managed manually
    noteIndex = '';
    diagramIndex = '';
  }

  const nextSchema = template
    .replace(/@@PROVIDER@@/g, provider)
    .replace(/@@NOTE_INDEX@@/g, noteIndex)
    .replace(/@@DIAGRAM_INDEX@@/g, diagramIndex);

  fs.writeFileSync(targetPath, nextSchema, 'utf-8');
  console.log(`[prisma] schema.prisma written with provider: ${provider}`);
}

main();


