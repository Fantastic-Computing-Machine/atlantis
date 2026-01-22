import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Resolve the database URL from environment variables
function resolveDatabaseUrl(): string {
    return process.env.DATABASE_URL || process.env.DB_CONNECTION || 'file:./data/atlantis.db';
}

export default defineConfig({
    schema: path.join(__dirname, 'schema.prisma'),
    datasource: {
        url: resolveDatabaseUrl(),
    },
});
