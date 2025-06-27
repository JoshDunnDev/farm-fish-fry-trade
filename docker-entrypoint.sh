#!/bin/bash
set -e

echo "Starting FarmyFishFry..."
echo "ULTRA SIMPLE VERSION - NO PRISMA OPERATIONS"

echo "Environment check:"
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo "yes" || echo "no")"
echo "NEXTAUTH_URL: $NEXTAUTH_URL"

echo "Starting Next.js application..."
exec "$@" 