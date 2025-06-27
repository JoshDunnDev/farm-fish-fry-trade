FROM node:18-slim AS base

# Cache busting - change this to force rebuild
ARG CACHE_BUST=999
RUN echo "Cache bust: $CACHE_BUST - FORCING REBUILD NOW"
RUN echo "This should appear in build logs if using new Dockerfile"

# Install dependencies only when needed
FROM base AS deps
# Install required packages for Prisma
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Generate Prisma client and ensure engines are properly set up
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Help Prisma detect OpenSSL
ENV OPENSSL_ROOT_DIR=/usr
ENV OPENSSL_LIB_DIR=/usr/lib
ENV OPENSSL_INCLUDE_DIR=/usr/include

# Install curl and openssl for health checks and Prisma
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

# Copy public folder (will be empty if no public assets exist)
COPY --from=builder /app/public ./public

# Copy the entire node_modules from builder (includes generated Prisma client)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy startup script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Change ownership of critical directories to nextjs user
RUN chown -R nextjs:nodejs /app/node_modules
RUN chown -R nextjs:nodejs /app/prisma

# Regenerate Prisma client with proper ownership
RUN npx prisma generate
RUN chown -R nextjs:nodejs /app/node_modules/@prisma || true
RUN chown -R nextjs:nodejs /app/node_modules/.prisma || true

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
