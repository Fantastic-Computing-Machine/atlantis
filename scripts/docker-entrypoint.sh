#!/bin/sh
set -e

# Add node_modules binaries to PATH
export PATH="/app/node_modules/.bin:$PATH"

echo "[entrypoint] Detecting database provider from DATABASE_URL..."

# Run the prepare-prisma-schema script to generate schema.prisma
node /app/scripts/prepare-prisma-schema.js

# Generate Prisma client based on detected provider
echo "[entrypoint] Generating Prisma client..."
prisma generate --schema=/app/prisma/schema.prisma --config=/app/prisma/prisma.config.ts

# Push schema to database (creates tables if they don't exist)
echo "[entrypoint] Syncing database schema..."
prisma db push --schema=/app/prisma/schema.prisma --config=/app/prisma/prisma.config.ts --accept-data-loss

echo "[entrypoint] Starting server..."
exec node server.js

