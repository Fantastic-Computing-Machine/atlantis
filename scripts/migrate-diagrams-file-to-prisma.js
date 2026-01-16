const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? 'file:./data/atlantis.db',
    },
  },
});

function makeId() {
  return Math.random().toString(36).slice(2, 8);
}

async function main() {
  const dataPath = path.join(process.cwd(), 'data', 'diagrams.json');

  try {
    await fs.access(dataPath);
  } catch {
    console.log('No data/diagrams.json found. Nothing to migrate.');
    return;
  }

  const existingCount = await prisma.diagram.count();
  if (existingCount > 0) {
    console.log('Database already has diagrams. Aborting migration.');
    return;
  }

  const raw = await fs.readFile(dataPath, 'utf-8');
  const diagrams = JSON.parse(raw);
  if (!Array.isArray(diagrams)) {
    throw new Error('Invalid diagrams.json format: expected an array.');
  }

  let migrated = 0;
  await prisma.$transaction(async (tx) => {
    for (const diagram of diagrams) {
      if (!diagram || !diagram.id) {
        continue;
      }

      const createdAt = diagram.createdAt ? new Date(diagram.createdAt) : new Date();
      const updatedAt = diagram.updatedAt ? new Date(diagram.updatedAt) : createdAt;
      const content = typeof diagram.content === 'string' ? diagram.content : '';
      const title = diagram.title || 'Untitled Diagram';
      const emoji = diagram.emoji || '📄';
      const contentId = `${diagram.id}-${makeId()}`;

      await tx.diagram.create({
        data: {
          id: diagram.id,
          title,
          emoji,
          createdAt,
          updatedAt,
          isFavorite: Boolean(diagram.isFavorite),
        },
      });

      await tx.content.create({
        data: {
          id: contentId,
          diagramId: diagram.id,
          content,
          updatedAt,
        },
      });

      migrated += 1;
    }
  });

  await fs.rename(dataPath, `${dataPath}.bak`);
  console.log(`Migrated ${migrated} diagrams. Backup saved to data/diagrams.json.bak.`);
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
