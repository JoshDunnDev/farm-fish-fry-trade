#!/bin/sh
set -e

echo "🌾🐟🍳 Starting FarmFishFryTrade..."
echo "🔧 Docker entrypoint version: 2.0 (simplified - no connection test)"

# Set OpenSSL legacy provider for compatibility
export OPENSSL_CONF=""

# Disable Prisma telemetry and problematic behaviors
export PRISMA_HIDE_UPDATE_MESSAGE=1
export PRISMA_SKIP_POSTINSTALL_GENERATE=1
export CHECKPOINT_DISABLE=1

# Simple wait to let database container start
echo "⏳ Waiting 10 seconds for database container to initialize..."
sleep 10

# Run database migrations with better error handling
echo "🗃️  Running database migrations..."
if npx prisma db push --skip-generate --accept-data-loss; then
  echo "✅ Database migrations completed successfully"
else
  echo "⚠️  Database migrations failed, but continuing startup..."
  echo "🔍 This might be normal if database is not ready yet"
fi

# Seed database if requested
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed 2>/dev/null || echo "⚠️  Seeding skipped"
fi

echo "🚀 Starting application..."

# Start the Next.js application
exec node server.js 