import { defineConfig } from '@prisma/config';
import { resolveDatabaseUrl } from './scripts/database-url';

const url = resolveDatabaseUrl();

export default defineConfig({
  datasource: {
    url,
  },
});
