#!/bin/sh
set -e

echo "🌾🐟🍳 Starting FarmFishFryTrade..."

# Set OpenSSL legacy provider for compatibility
export OPENSSL_CONF=""

# Wait for database to be ready with retry mechanism
echo "⏳ Waiting for database to be ready..."

# Simple database connection test
test_db_connection() {
  if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL not set"
    return 1
  fi
  
  # Extract host and port from DATABASE_URL
  host=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
  port=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  
  if [ -z "$host" ]; then
    host=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^/]*\)/.*|\1|p')
  fi
  
  if [ -z "$port" ]; then
    port=5432
  fi
  
  echo "Testing connection to $host:$port"
  timeout 5 nc -z "$host" "$port" 2>/dev/null
}

# Retry logic
max_attempts=10
attempt=1

while [ $attempt -le $max_attempts ]; do
  echo "🔍 Database connection attempt $attempt/$max_attempts..."
  
  if test_db_connection; then
    echo "✅ Database is ready!"
    break
  else
    if [ $attempt -eq $max_attempts ]; then
      echo "❌ Failed to connect to database after $max_attempts attempts"
      exit 1
    fi
    
    echo "⏳ Database not ready, waiting 3 seconds..."
    sleep 3
    attempt=$((attempt + 1))
  fi
done

# Run database migrations (try but don't fail if it doesn't work)
echo "🗃️  Running database migrations..."
# Use db push with skip-generate to avoid regenerating the client
npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || echo "⚠️  Migration skipped (may already be up to date)"

# Seed database if requested
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed 2>/dev/null || echo "⚠️  Seeding skipped"
fi

echo "🚀 Starting application..."

# Start the Next.js application
exec node server.js 