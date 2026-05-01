import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { resolveDatabaseUrl } from '../scripts/database-url';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
