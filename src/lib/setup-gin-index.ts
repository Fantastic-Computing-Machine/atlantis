import { prisma } from './prisma';

/**
 * Creates GIN indexes for PostgreSQL full-text search if they don't exist.
 * This is called during application initialization.
 */
// Prevent re-running during hot reloads in dev
let hasSetup = false;

export async function setupGinIndexes(provider: string) {
  if (provider !== 'postgresql' || hasSetup) return;

  try {
    // Create extension if needed (usually requires superuser, might fail on some hosted dbs, 
    // but often installed by default. We'll skip explicit extension creation and rely on built-in TO_TSVECTOR)

    // Note GIN Index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "note_gin_idx" 
      ON "Note" USING GIN (to_tsvector('english', "searchVector"));
    `);

    // Diagram GIN Index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "diagram_gin_idx" 
      ON "Diagram" USING GIN (to_tsvector('english', "searchVector"));
    `);
    hasSetup = true;
    console.log('[search] Verified GIN indexes for full-text search');
  }
  catch (error) {
    console.warn('[search] Failed to setup GIN indexes. Search performance might be degraded.', error);
  }
}
