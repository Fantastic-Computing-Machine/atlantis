# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Install dependencies only
# ============================================
FROM node:20-alpine AS deps
WORKDIR /app

# Install libc6-compat for Alpine compatibility
RUN apk add --no-cache libc6-compat

# Copy only package files for better layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN --mount=type=cache,target=/root/.npm npm ci

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application with standalone output
RUN npm run build

# ============================================
# Stage 3: Production runner (minimal image)
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# No extra packages needed for healthcheck

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the necessary files from builder
# 1. Public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 2. Standalone server (includes minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 3. Static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create data directory for diagram persistence
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start the standalone server
CMD ["node", "server.js"]
