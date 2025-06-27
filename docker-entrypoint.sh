#!/bin/sh
set -e

echo "🌾🐟🍳 Starting FarmFishFryTrade..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until npx prisma db push --accept-data-loss 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Run database migrations
echo "🗃️  Running database migrations..."
npx prisma db push --accept-data-loss

# Generate Prisma client (in case it's needed)
echo "🔧 Ensuring Prisma client is generated..."
npx prisma generate

# Seed database if it's empty (optional - only run if SEED_DATABASE=true)
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed || echo "⚠️  Seeding failed or no seed script available"
fi

echo "🚀 Starting application..."

# Start the Next.js application
exec node server.js 