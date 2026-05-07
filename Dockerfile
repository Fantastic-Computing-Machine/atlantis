# syntax=docker/dockerfile:1

# ============================================
# Base image with security updates
# ============================================
FROM node:22-alpine AS base
# Install OpenSSL (required for Prisma) and CA certificates
# libc6-compat is sometimes needed for compatibility with certain libraries
RUN apk add --no-cache openssl ca-certificates libc6-compat

# ============================================
# Stage 1: Install dependencies + Prisma client
# ============================================
FROM base AS deps
WORKDIR /app

ARG PRISMA_PROVIDER=sqlite
ARG DATABASE_URL=file:./data/atlantis.db
ENV PRISMA_PROVIDER=${PRISMA_PROVIDER}
ENV DATABASE_URL=${DATABASE_URL}

# Copy package and prisma metadata for cached install/generate
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts/prepare-prisma-schema.js ./scripts/prepare-prisma-schema.js

# Install all dependencies (including devDependencies for build) and generate Prisma client
ENV NPM_CONFIG_FETCH_RETRIES=5 \
  NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
  NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
  for i in 1 2 3; do \
  npm ci --no-audit --no-fund && break || \
  { [ $i -lt 3 ] && echo "npm ci attempt $i failed, retrying..." && sleep 5; }; \
  done && \
  npm run prisma:prepare && \
  npx prisma generate

# ============================================
# Stage 1.5: Install runtime startup tools only
# ============================================
FROM base AS runtime-tools
WORKDIR /runtime-tools

COPY package-lock.json ./

# Install only the Prisma CLI needed by docker-entrypoint.sh.
ENV NPM_CONFIG_FETCH_RETRIES=5 \
  NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
  NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
  set -eu; \
  npm init -y >/dev/null; \
  PRISMA_VERSION="$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version")"; \
  for i in 1 2 3; do \
    npm install --omit=dev --no-audit --no-fund --package-lock=false --no-save \
      "prisma@$PRISMA_VERSION" && break; \
    if [ "$i" -eq 3 ]; then exit 1; fi; \
    echo "runtime tool install attempt $i failed, retrying..."; \
    sleep 5; \
  done

# ============================================
# Stage 2: Build the application
# ============================================
FROM base AS builder
WORKDIR /app

ARG PRISMA_PROVIDER=sqlite
ARG DATABASE_URL=file:./data/atlantis.db
ENV PRISMA_PROVIDER=${PRISMA_PROVIDER}
ENV DATABASE_URL=${DATABASE_URL}
ENV PRISMA_SKIP_BACKFILL=true

# Copy dependencies and Prisma artifacts from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/scripts ./scripts

# Copy source files
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone

# Prepare schema/client, seed empty DB, and build app
RUN npm run prisma:prepare && \
  npx prisma generate && \
  mkdir -p /app/data && \
  npx prisma db push && \
  npm run build

# ============================================
# Stage 3: Production runner (minimal image)
# ============================================
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

# Copy only the necessary files from builder
# 1. Public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 2. Standalone server (includes minimal node_modules from Next.js)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 3. Static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 4. Prisma client runtime compiler files pruned by Next tracing
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma/client/runtime ./node_modules/@prisma/client/runtime

# 5. Runtime startup tools for Prisma schema generation/sync
COPY --from=runtime-tools --chown=nextjs:nodejs /runtime-tools/node_modules ./runtime-tools/node_modules

# 6. Prisma schema template, config, and scripts for runtime generation
COPY --from=builder --chown=nextjs:nodejs /app/prisma/schema.template.prisma ./prisma/schema.template.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma/prisma.config.ts ./prisma/prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/prepare-prisma-schema.js ./scripts/prepare-prisma-schema.js
COPY --from=builder --chown=nextjs:nodejs /app/scripts/database-url.js ./scripts/database-url.js
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

# 7. Baseline SQLite database (empty schema)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# Create data directory for diagram persistence
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Install a reduced LaTeX runtime and su-exec for privilege dropping.
# --no-scripts avoids slow all-format generation; mktexlsr is enough for pdflatex package lookup.
RUN apk add --no-cache --no-scripts texlive-latexrecommended texmf-dist-latexextra fontconfig su-exec && \
  mktexlsr && \
  fmtutil-sys --byfmt pdflatex

# NOTE: We do NOT switch to nextjs user here because the entrypoint
# needs to run as root initially to fix mounted volume permissions.
# The entrypoint will drop privileges to nextjs after setup.

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start via entrypoint (generates Prisma client + syncs schema at runtime)
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
