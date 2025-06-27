import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

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

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
