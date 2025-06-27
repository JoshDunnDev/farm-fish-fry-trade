#!/bin/sh
set -e

echo "🌾🐟🍳 Starting FarmFishFryTrade..."

# Set OpenSSL legacy provider for compatibility
export OPENSSL_CONF=""

# Wait for database to be ready with retry mechanism
echo "⏳ Waiting for database to be ready..."

# Function to test database connection using a simpler approach
test_db_connection() {
  # Extract host and port from DATABASE_URL using shell commands
  if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL not set"
    return 1
  fi
  
  # Extract host and port from postgres://user:pass@host:port/db format
  # Remove protocol
  url_without_protocol=$(echo "$DATABASE_URL" | sed 's|^[^:]*://||')
  # Extract everything before the @ symbol (user:pass)
  user_pass=$(echo "$url_without_protocol" | cut -d'@' -f1)
  # Extract everything after the @ symbol (host:port/db)
  host_port_db=$(echo "$url_without_protocol" | cut -d'@' -f2)
  # Extract host:port (everything before the /)
  host_port=$(echo "$host_port_db" | cut -d'/' -f1)
  # Extract host
  host=$(echo "$host_port" | cut -d':' -f1)
  # Extract port (default to 5432 if not specified)
  port=$(echo "$host_port" | cut -d':' -f2)
  if [ "$port" = "$host" ]; then
    port=5432
  fi
  
  echo "Testing connection to database at $host:$port"
  
  # Use timeout and nc (netcat) for simple TCP connection test
  if timeout 5 nc -z "$host" "$port" 2>/dev/null; then
    echo "Database connection successful"
    return 0
  else
    echo "Database connection failed"
    return 1
  fi
}

# Retry logic
max_attempts=20
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