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

async function seedPricingData() {
  console.log("Seeding pricing data...");
  
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
    // Default pricing data
    pricingData = {
      lastUpdated: new Date().toISOString().split('T')[0],
      version: "1.0.0",
      items: {
        "salt": { "tier1": 4, "tier2": 4, "tier3": 4, "tier4": 4 },
        "fish": { "tier1": 1.333, "tier2": 1.666, "tier3": 2, "tier4": 2.333 },
        "bulb": { "tier1": 0.5, "tier2": 0.625, "tier3": 0.75, "tier4": 0.875 }
      },
      notes: {
        "pricing": "Prices are in Hex Coins (HC) per piece.",
        "updates": "Prices are managed through the admin interface and stored in the database.",
        "structure": "Items are organized by name, with prices for each tier."
      }
    };
  }

  // Find or create an admin user
  let adminUser = await prisma.user.findFirst({
    where: { isAdmin: true }
  });

  if (!adminUser) {
    console.log("Creating system admin user for pricing...");
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@farmyfishfry.com',
        name: 'System Admin',
        isAdmin: true,
      }
    });
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
    console.log(`Seeded ${pricingEntries.length} pricing entries`);
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
  console.log(`Seeded ${metadataEntries.length} metadata entries`);
}

async function main() {
  console.log("🌱 Development seeding: Creating sample data...");
  console.log("⚠️  Note: This includes sample users and orders - use 'npm run db:seed-production' for production");

  // Seed pricing data first
  await seedPricingData();

  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { discordId: "sample-discord-id-1" },
    update: {},
    create: {
      discordId: "sample-discord-id-1",
      discordName: "FarmMaster",
      inGameName: "FarmMaster_01",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { discordId: "sample-discord-id-2" },
    update: {},
    create: {
      discordId: "sample-discord-id-2",
      discordName: "FishCatcher",
      inGameName: "FishCatcher_02",
    },
  });

  const user3 = await prisma.user.upsert({
    where: { discordId: "sample-discord-id-3" },
    update: {},
    create: {
      discordId: "sample-discord-id-3",
      discordName: "MasterChef",
      inGameName: "MasterChef_03",
    },
  });

  // Create sample orders
  const orders = [
    // Buy orders
    {
      itemName: "Iron Ore",
      tier: 1,
      pricePerUnit: 5.0,
      amount: 100,
      orderType: "BUY" as const,
      status: "OPEN" as const,
      creatorId: user1.id,
    },
    {
      itemName: "Salmon",
      tier: 3,
      pricePerUnit: 12.5,
      amount: 50,
      orderType: "BUY" as const,
      status: "FULFILLED" as const,
      creatorId: user2.id,
      claimerId: user3.id,
      fulfilledAt: new Date(),
    },
    {
      itemName: "Wheat",
      tier: 1,
      pricePerUnit: 2.0,
      amount: 200,
      orderType: "BUY" as const,
      status: "IN_PROGRESS" as const,
      creatorId: user3.id,
      claimerId: user1.id,
    },
    {
      itemName: "Cooked Fish",
      tier: 5,
      pricePerUnit: 25.0,
      amount: 25,
      orderType: "BUY" as const,
      status: "READY_TO_TRADE" as const,
      creatorId: user1.id,
      claimerId: user2.id,
    },
    {
      itemName: "Diamond",
      tier: 10,
      pricePerUnit: 100.0,
      amount: 5,
      orderType: "BUY" as const,
      status: "OPEN" as const,
      creatorId: user2.id,
    },
    // Sell orders
    {
      itemName: "Copper Ore",
      tier: 2,
      pricePerUnit: 8.0,
      amount: 150,
      orderType: "SELL" as const,
      status: "OPEN" as const,
      creatorId: user1.id,
    },
    {
      itemName: "Trout",
      tier: 2,
      pricePerUnit: 7.5,
      amount: 75,
      orderType: "SELL" as const,
      status: "READY_TO_TRADE" as const,
      creatorId: user2.id,
      claimerId: user3.id,
    },
    {
      itemName: "Bread",
      tier: 3,
      pricePerUnit: 15.0,
      amount: 40,
      orderType: "SELL" as const,
      status: "READY_TO_TRADE" as const,
      creatorId: user3.id,
      claimerId: user1.id,
    },
    {
      itemName: "Steel Ingot",
      tier: 6,
      pricePerUnit: 45.0,
      amount: 20,
      orderType: "SELL" as const,
      status: "OPEN" as const,
      creatorId: user1.id,
    },
    {
      itemName: "Golden Fish",
      tier: 8,
      pricePerUnit: 80.0,
      amount: 10,
      orderType: "SELL" as const,
      status: "FULFILLED" as const,
      creatorId: user2.id,
      claimerId: user3.id,
      fulfilledAt: new Date(),
    },
  ];

  for (const order of orders) {
    await prisma.order.upsert({
      where: { id: `seed-order-${order.itemName}-${order.tier}` },
      update: {},
      create: {
        id: `seed-order-${order.itemName}-${order.tier}`,
        ...order,
      },
    });
  }

  console.log("🎉 Development database seeded successfully!");
  console.log("📊 Created: Pricing data, sample users, and sample orders");
  console.log("🔧 For production use: npm run db:seed-production");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
