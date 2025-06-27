#!/bin/sh
set -e

echo "🌾🐟🍳 Starting FarmFishFryTrade..."
echo "🚨🚨🚨 ULTRA SIMPLE VERSION - NO PRISMA OPERATIONS 🚨🚨🚨"

# Set environment variables to disable all Prisma problematic behaviors
export PRISMA_HIDE_UPDATE_MESSAGE=1
export PRISMA_SKIP_POSTINSTALL_GENERATE=1
export CHECKPOINT_DISABLE=1
export OPENSSL_CONF=""

echo "⏳ Waiting 15 seconds for database..."
sleep 15

echo "🚀 Starting application directly (no migrations)..."
echo "📝 Note: Database migrations will happen on first API call"

# Start the Next.js application
exec node server.js 