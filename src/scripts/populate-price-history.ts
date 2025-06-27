import { prisma } from "../lib/prisma";

async function populatePriceHistory() {
  try {
    console.log("Starting price history population...");

    // Get all existing pricing records
    const existingPrices = await prisma.pricing.findMany({
      include: {
        creator: true,
      },
    });

    console.log(`Found ${existingPrices.length} existing prices to migrate`);

    // Create price history entries for each existing price
    const historyEntries = existingPrices.map((price) => ({
      itemName: price.itemName,
      tier: price.tier,
      price: price.price,
      previousPrice: null, // No previous price for initial entries
      changeType: "created",
      createdAt: price.createdAt, // Use the original creation date
      createdBy: price.createdBy,
    }));

    // Batch insert the history entries
    const result = await prisma.priceHistory.createMany({
      data: historyEntries,
      skipDuplicates: true, // Skip if any duplicates exist
    });

    console.log(`Successfully created ${result.count} price history entries`);
    console.log("Price history population completed!");
  } catch (error) {
    console.error("Error populating price history:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  populatePriceHistory()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { populatePriceHistory };
