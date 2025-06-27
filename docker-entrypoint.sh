#!/bin/sh
set -e

echo "🌾🐟🍳 Starting FarmFishFryTrade..."

# Wait for database to be ready with retry mechanism
echo "⏳ Waiting for database to be ready..."

# Function to test database connection
test_db_connection() {
  npx prisma db push --accept-data-loss --force-reset 2>&1
}

# Retry logic
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
  echo "🔍 Database connection attempt $attempt/$max_attempts..."
  
  if test_db_connection; then
    echo "✅ Database is ready!"
    break
  else
    if [ $attempt -eq $max_attempts ]; then
      echo "❌ Failed to connect to database after $max_attempts attempts"
      echo "🔍 Checking environment variables..."
      echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo "Yes" || echo "No")"
      echo "DATABASE_URL value: $DATABASE_URL"
      exit 1
    fi
    
    echo "⏳ Database not ready, waiting 5 seconds..."
    sleep 5
    attempt=$((attempt + 1))
  fi
done

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Seed database if requested
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed || echo "⚠️  Seeding failed or no seed script available"
fi

echo "🚀 Starting application..."

# Start the Next.js application
exec node server.js 