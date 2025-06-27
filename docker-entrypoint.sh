#!/bin/sh
set -e

echo "🌾🐟🍳 Starting FarmFishFryTrade..."

# Set OpenSSL legacy provider for compatibility
export OPENSSL_CONF=""

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