#!/bin/sh
set -e

echo "🌾🐟🍳 Starting FarmFishFryTrade..."

# Set OpenSSL legacy provider for compatibility
export OPENSSL_CONF=""

# Wait for database to be ready with retry mechanism
echo "⏳ Waiting for database to be ready..."

# Function to test database connection using a simpler approach
test_db_connection() {
  # Extract host and port from DATABASE_URL for basic connectivity test
  node -e "
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error('DATABASE_URL not set');
      process.exit(1);
    }
    
    try {
      const parsed = new URL(url);
      const host = parsed.hostname;
      const port = parsed.port || 5432;
      
      console.log('Testing connection to database at', host + ':' + port);
      
      // Use a simple TCP connection test
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(5000);
      
      socket.connect(port, host, () => {
        console.log('Database connection successful');
        socket.destroy();
        process.exit(0);
      });
      
      socket.on('error', (err) => {
        console.error('Database connection failed:', err.message);
        socket.destroy();
        process.exit(1);
      });
      
      socket.on('timeout', () => {
        console.error('Database connection timeout');
        socket.destroy();
        process.exit(1);
      });
      
    } catch (error) {
      console.error('Invalid DATABASE_URL:', error.message);
      process.exit(1);
    }
  " 2>/dev/null
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