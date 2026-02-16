#!/bin/sh
set -e

# Add node_modules binaries to PATH
export PATH="/app/node_modules/.bin:$PATH"

# Normalize SQLite DATABASE_URL to an absolute path
normalize_sqlite_url() {
  url="$1"
  path_part="${url#file:}"
  path_no_query="${path_part%%\?*}"
  path_clean="${path_no_query%%#*}"

  case "$path_clean" in
    /*)
      resolved="$path_clean"
      ;;
    *)
      resolved=$(cd /app && readlink -f "$path_clean" 2>/dev/null || true)
      [ -n "$resolved" ] || resolved="/app/$path_clean"
      ;;
  esac

  echo "file:$resolved"
}

run_as_app() {
  if [ "$(id -u)" -eq 0 ]; then
    su-exec nextjs "$@"
  else
    "$@"
  fi
}

# Ensure DATABASE_URL is set with an absolute path for SQLite
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/atlantis.db"
  echo "[entrypoint] DATABASE_URL not set, defaulting to: $DATABASE_URL"
fi

case "$DATABASE_URL" in
  file:*)
    normalized=$(normalize_sqlite_url "$DATABASE_URL")
    if [ "$DATABASE_URL" != "$normalized" ]; then
      export DATABASE_URL="$normalized"
      echo "[entrypoint] Normalized SQLite DATABASE_URL to: $DATABASE_URL"
    else
      echo "[entrypoint] Using DATABASE_URL: $DATABASE_URL"
    fi
    ;;
  *)
    echo "[entrypoint] Using DATABASE_URL: $DATABASE_URL"
    ;;
esac

echo "[entrypoint] Detecting database provider from DATABASE_URL..."

data_dir="/app/data"
case "$DATABASE_URL" in
  file:*)
    sqlite_path="${DATABASE_URL#file:}"
    sqlite_path="${sqlite_path%%\?*}"
    sqlite_path="${sqlite_path%%#*}"
    data_dir=$(dirname "$sqlite_path")
    ;;
esac

# Ensure data directory exists with correct permissions
echo "[entrypoint] Ensuring $data_dir directory exists and is writable..."
if [ "$(id -u)" -eq 0 ]; then
  mkdir -p "$data_dir"
  current_owner=$(stat -c '%U:%G' "$data_dir" 2>/dev/null || echo '')
  if [ "$current_owner" != "nextjs:nodejs" ]; then
    echo "[entrypoint] Fixing ownership of $data_dir (may take a while)..."
    chown -R nextjs:nodejs "$data_dir"
  fi
  chmod 755 "$data_dir"
else
  if ! mkdir -p "$data_dir" 2>/dev/null; then
    echo "[entrypoint] Failed to create $data_dir as non-root; start the container as root to allow permission repair."
    exit 1
  fi
  if [ ! -w "$data_dir" ]; then
    echo "[entrypoint] $data_dir is not writable; start the container as root to fix permissions."
    exit 1
  fi
fi

# Run the prepare-prisma-schema script to generate schema.prisma
run_as_app node /app/scripts/prepare-prisma-schema.js

# Generate Prisma client based on detected provider
echo "[entrypoint] Generating Prisma client..."
run_as_app prisma generate --schema=/app/prisma/schema.prisma --config=/app/prisma/prisma.config.ts

# Push schema to database (creates tables if they don't exist)
echo "[entrypoint] Syncing database schema..."
run_as_app prisma db push --schema=/app/prisma/schema.prisma --config=/app/prisma/prisma.config.ts --accept-data-loss

# Drop privileges and start the server as nextjs user (PID 1 is node)
echo "[entrypoint] Starting server as nextjs user..."
if [ "$(id -u)" -eq 0 ]; then
  exec su-exec nextjs node server.js
else
  exec node server.js
fi
