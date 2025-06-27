#!/bin/bash

echo "🌾🐟🍳 FarmFishFryTrade - Production Deployment Test"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env file with your configuration before running again."
    echo "   Especially set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "🧹 Cleaning up any existing containers..."
docker-compose down -v 2>/dev/null || true

echo "🏗️  Building and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are healthy
echo "🔍 Checking service health..."

DB_HEALTH=$(docker-compose ps db | grep -c "healthy" || echo "0")
if [ "$DB_HEALTH" -eq "0" ]; then
    echo "❌ Database is not healthy"
    docker-compose logs db
    exit 1
fi

APP_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")
if [ "$APP_HEALTH" != "200" ]; then
    echo "⚠️  Application health check failed (HTTP $APP_HEALTH)"
    echo "   This might be normal if Discord OAuth is not configured yet."
    echo "   Check logs: docker-compose logs app"
else
    echo "✅ Application is healthy!"
fi

echo ""
echo "🎉 Deployment test complete!"
echo ""
echo "Services:"
echo "  📱 Application: http://localhost:3000"
echo "  🗃️  Database: localhost:5432"
echo "  🔍 Health Check: http://localhost:3000/api/health"
echo ""
echo "Useful commands:"
echo "  📋 View logs: docker-compose logs -f"
echo "  🛑 Stop services: docker-compose down"
echo "  🧹 Clean everything: docker-compose down -v"
echo ""

if [ "$APP_HEALTH" != "200" ]; then
    echo "⚠️  Next steps:"
    echo "  1. Configure Discord OAuth in .env file"
    echo "  2. Restart with: docker-compose restart app"
    echo ""
fi 