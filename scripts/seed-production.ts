import { PrismaClient } from "@prisma/client";
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface PricingData {
  lastUpdated: string;
  version: string;
  items: {
    [itemName: string]: {
      [tierKey: string]: number;
    };
  };
  notes: {
    [key: string]: string;
  };
}

async function seedPricingDataOnly() {
  console.log("Production seeding: Pricing data only...");
  
  // Check if pricing data already exists
  const existingPricing = await prisma.pricing.count();
  if (existingPricing > 0) {
    console.log("Pricing data already exists, skipping pricing seed");
    return;
  }

  // Try to read from the old pricing.json file if it exists
  let pricingData: PricingData;
  const pricingPath = path.join(process.cwd(), 'src/data/pricing.json');
  
  if (fs.existsSync(pricingPath)) {
    console.log("Found existing pricing.json, migrating to database...");
    const fileContent = fs.readFileSync(pricingPath, 'utf8');
    pricingData = JSON.parse(fileContent);
  } else {
    console.log("No pricing.json found, using default pricing data...");
    // Default pricing data for production
    pricingData = {
      lastUpdated: new Date().toISOString().split('T')[0],
      version: "1.0.0",
      items: {
        "salt": { "tier1": 4, "tier2": 4, "tier3": 4, "tier4": 4 },
        "fish": { "tier1": 1.333, "tier2": 1.666, "tier3": 2, "tier4": 2.333 },
        "bulb": { "tier1": 0.5, "tier2": 0.625, "tier3": 0.75, "tier4": 0.875 },
      },
      notes: {
        "pricing": "Prices are in Hex Coins (HC) per piece.",
        "updates": "Prices are managed through the admin interface and stored in the database.",
        "structure": "Items are organized by name, with prices for each tier.",
        "production": "This is production pricing data - manage through admin panel."
      }
    };
  }

  // Find or create a system admin user (minimal data for production)
  let adminUser = await prisma.user.findFirst({
    where: { isAdmin: true }
  });

  if (!adminUser) {
    console.log("Creating system admin user for pricing management...");
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@farmyfishfry.com',
        name: 'System Admin',
        isAdmin: true,
      }
    });
    console.log("System admin user created - you can change this through the admin panel");
  } else {
    console.log(`Using existing admin user: ${adminUser.email || adminUser.name || 'Unknown'}`);
  }

  // Seed pricing items
  const pricingEntries = [];
  for (const [itemName, prices] of Object.entries(pricingData.items)) {
    for (const [tierKey, price] of Object.entries(prices)) {
      const tier = parseInt(tierKey.replace('tier', ''));
      pricingEntries.push({
        itemName,
        tier,
        price,
        createdBy: adminUser.id,
      });
    }
  }

  if (pricingEntries.length > 0) {
    await prisma.pricing.createMany({
      data: pricingEntries,
    });
    console.log(`✅ Seeded ${pricingEntries.length} pricing entries`);
  }

  // Seed metadata
  const metadataEntries = [
    { key: 'lastUpdated', value: pricingData.lastUpdated },
    { key: 'version', value: pricingData.version },
    ...Object.entries(pricingData.notes).map(([key, value]) => ({
      key: `note_${key}`,
      value,
    })),
  ];

  await prisma.pricingMetadata.createMany({
    data: metadataEntries,
  });
  console.log(`✅ Seeded ${metadataEntries.length} metadata entries`);

  console.log("🎉 Production pricing data seeded successfully!");
  console.log("📝 Note: No sample users or orders were created in production mode");
}

async function main() {
  try {
    await seedPricingDataOnly();
  } catch (error) {
    console.error('❌ Error seeding production data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 