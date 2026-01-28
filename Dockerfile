# syntax=docker/dockerfile:1

# ============================================
# Base image with security updates
# ============================================
FROM node:20-alpine AS base
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
RUN --mount=type=cache,target=/root/.npm \
  npm ci && \
  npm run prisma:prepare && \
  npx prisma generate

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

# 4. Full node_modules from deps stage for runtime Prisma CLI
# (Required because prisma generate has many transitive dependencies)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# 5. Prisma schema template, config, and scripts for runtime generation
COPY --from=builder --chown=nextjs:nodejs /app/prisma/schema.template.prisma ./prisma/schema.template.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma/prisma.config.ts ./prisma/prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/prepare-prisma-schema.js ./scripts/prepare-prisma-schema.js
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

# 6. Baseline SQLite database (empty schema)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# Create data directory for diagram persistence
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Install TeX Live for LaTeX support
RUN apk add --no-cache texlive-full fontconfig


# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start via entrypoint (generates Prisma client + syncs schema at runtime)
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
