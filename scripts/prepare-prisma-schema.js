const fs = require('fs');
const path = require('path');

function resolveProvider() {
  const raw = (process.env.DB_CONNECTION || process.env.PRISMA_PROVIDER || '').toLowerCase();
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
  const nextSchema = template.replace(/@@PROVIDER@@/g, provider);

  fs.writeFileSync(targetPath, nextSchema, 'utf-8');
  console.log(`[prisma] schema.prisma written with provider: ${provider}`);
}

main();
