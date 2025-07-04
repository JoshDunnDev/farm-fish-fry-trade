FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Install required packages for Prisma with proper OpenSSL
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    libssl3 \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies with cache mount
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm,id=npm-deps \
    npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install build dependencies with proper OpenSSL
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    libssl3 \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install all dependencies with cache mount
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm,id=npm-builder \
    npm ci

COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Set Node.js memory limit and build optimizations
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client, compile seed scripts, and build with cache
RUN --mount=type=cache,target=/tmp/.buildcache \
    --mount=type=cache,target=/app/.next/cache,id=nextjs-cache \
    npx prisma generate && \
    npm run build:seed-scripts && \
    npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install only runtime packages with proper OpenSSL
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Generate Prisma client in production
RUN npx prisma generate

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy startup script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
