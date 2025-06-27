FROM node:18-slim AS base

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
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install all dependencies (including dev dependencies) for building
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Generate Prisma client and build the application
RUN npx prisma generate && npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install only runtime packages
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

# Copy production node_modules from deps stage (smaller)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client in production environment
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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
