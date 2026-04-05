/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

function resolveProvider() {
  const envVar =
    process.env.DATABASE_URL || process.env.DB_CONNECTION || process.env.PRISMA_PROVIDER || '';
  const raw = envVar.toLowerCase();

  if (raw.includes('postgres')) return 'postgresql';
  if (raw.includes('mysql')) return 'mysql';

  return 'sqlite';
}

function main() {
  const provider = resolveProvider();
  const templatePath = path.join(__dirname, '..', 'prisma', 'schema.template.prisma');
  const targetPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

  const template = fs.readFileSync(templatePath, 'utf-8');

  // GIN indexes for Postgres are managed manually
  const isPostgres = provider === 'postgresql';
  const noteIndex = isPostgres ? '' : '@@index([searchVector], map: "note_searchVector_idx")';
  const diagramIndex = isPostgres ? '' : '@@index([searchVector], map: "diagram_searchVector_idx")';
  const previewFeatures = isPostgres ? 'previewFeatures = ["fullTextSearchPostgres"]' : '';

  const nextSchema = template
    .replace(/@@PROVIDER@@/g, provider)
    .replace(/@@PREVIEW_FEATURES@@/g, previewFeatures)
    .replace(/@@NOTE_INDEX@@/g, noteIndex)
    .replace(/@@DIAGRAM_INDEX@@/g, diagramIndex);

  fs.writeFileSync(targetPath, nextSchema, 'utf-8');
  console.log(`[prisma] schema.prisma written with provider: ${provider}`);
}

main();
