#!/bin/bash
set -e

echo "Starting FarmyFishFry..."

echo "Environment check:"
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo "yes" || echo "no")"
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
echo "Production mode: Only pricing data will be seeded (no sample users/orders)"

# Wait for database to be ready
echo "Waiting for database to be ready..."
until npx prisma db push --accept-data-loss 2>/dev/null; do
  echo "Database not ready, waiting 5 seconds..."
  sleep 5
done

echo "Database is ready!"

# Run database migrations/push schema
echo "Applying database schema..."
npx prisma db push --accept-data-loss

echo "Database schema applied successfully!"

# Seed the database (production mode - pricing only)
echo "Seeding database (production mode - pricing data only)..."
npm run db:seed-production

echo "Database seeded successfully!"

echo "Starting Next.js application..."
exec "$@" 