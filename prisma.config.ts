import { defineConfig } from '@prisma/config';

const url = process.env.DATABASE_URL ?? process.env.DB_CONNECTION ?? 'file:./data/atlantis.db';

export default defineConfig({
  datasource: {
    url,
  },
});
