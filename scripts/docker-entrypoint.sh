#!/bin/sh
set -e

# Add node_modules binaries to PATH
export PATH="/app/node_modules/.bin:$PATH"

# Ensure DATABASE_URL is set with an absolute path for SQLite
# This is critical when a volume is mounted to /app/data
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/atlantis.db"
  echo "[entrypoint] DATABASE_URL not set, defaulting to: $DATABASE_URL"
else
  echo "[entrypoint] Using DATABASE_URL: $DATABASE_URL"
fi

echo "[entrypoint] Detecting database provider from DATABASE_URL..."

# Ensure data directory exists with correct permissions
# This runs as root so it can fix permissions on mounted volumes
echo "[entrypoint] Ensuring /app/data directory exists and is writable..."
mkdir -p /app/data
chown -R nextjs:nodejs /app/data
chmod 755 /app/data

# Run the prepare-prisma-schema script to generate schema.prisma
node /app/scripts/prepare-prisma-schema.js

# Generate Prisma client based on detected provider
echo "[entrypoint] Generating Prisma client..."
prisma generate --schema=/app/prisma/schema.prisma --config=/app/prisma/prisma.config.ts

# Push schema to database (creates tables if they don't exist)
echo "[entrypoint] Syncing database schema..."
prisma db push --schema=/app/prisma/schema.prisma --config=/app/prisma/prisma.config.ts --accept-data-loss

# Drop privileges and start the server as nextjs user
echo "[entrypoint] Starting server as nextjs user..."
exec su-exec nextjs node server.js
