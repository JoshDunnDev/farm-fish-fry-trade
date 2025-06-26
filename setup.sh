#!/bin/bash

echo "🌾🐟🍳 Setting up FarmFishFryTrade..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed!"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔧 Creating .env.local file..."
    cp env.example .env.local
    echo "⚠️  Please edit .env.local with your Discord OAuth credentials!"
else
    echo "✅ .env.local already exists"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Push database schema
echo "🗃️  Setting up database schema..."
npx prisma db push

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Seed database with sample data
echo "🌱 Seeding database with sample data..."
npm run db:seed

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your Discord OAuth credentials"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "For Discord OAuth setup:"
echo "1. Go to https://discord.com/developers/applications"
echo "2. Create a new application"
echo "3. Add redirect URI: http://localhost:3000/api/auth/callback/discord"
echo "4. Copy Client ID and Secret to .env.local"
echo "" 
