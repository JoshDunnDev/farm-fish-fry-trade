# Database Seeding

This project uses different seeding strategies for development and production environments.

## Development Seeding

**Command:** `npm run db:seed`  
**File:** `prisma/seed.ts`

**Creates:**
- ✅ Pricing data (items and metadata)
- ✅ Sample users (3 test users)
- ✅ Sample orders (10 test orders with various statuses)

**Use when:** Setting up local development environment

## Production Seeding

**Command:** `npm run db:seed-production`  
**File:** `scripts/seed-production.ts`

**Creates:**
- ✅ Pricing data (items and metadata)
- ✅ System admin user (if none exists)
- ❌ No sample users
- ❌ No sample orders

**Use when:** Deploying to production

## Docker Production

In Docker production environments, the `docker-entrypoint.sh` automatically runs:
```bash
npm run db:seed-production
```

This ensures only essential pricing data is seeded, keeping the production database clean.

## Manual Pricing Seeding

**Command:** `npm run db:seed-pricing`  
**File:** `scripts/seed-pricing.ts`

For manually seeding just pricing data if needed.

## Important Notes

- All seeding scripts check if data already exists before creating new records
- Production seeding will NOT overwrite existing pricing data
- The system admin user created in production can be changed through the admin panel
- Pricing data includes default items like salt, fish, bulb, wheat, iron ore, and copper ore

## Pricing Data Management

Once seeded, pricing data should be managed through:
- **Admin Panel:** `/admin/pricing` (for authenticated admin users)
- **API Endpoints:** `/api/admin/pricing` (for programmatic updates)

The old file-based pricing system has been replaced with database storage for instant updates and better reliability. 