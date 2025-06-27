import { prisma } from "@/lib/prisma";

export interface PriceUpdate {
  itemName: string;
  tier: number;
  newPrice: number;
  previousPrice?: number;
  changeType: "created" | "updated" | "deleted";
  userId: string;
}

/**
 * Records a price change in the price history table
 */
export async function recordPriceChange({
  itemName,
  tier,
  newPrice,
  previousPrice,
  changeType,
  userId,
}: PriceUpdate) {
  try {
    await prisma.priceHistory.create({
      data: {
        itemName,
        tier,
        price: newPrice,
        previousPrice,
        changeType,
        createdBy: userId,
      },
    });

    console.log(
      `Price history recorded: ${itemName} T${tier} ${changeType} - ${newPrice}`
    );
  } catch (error) {
    console.error("Error recording price history:", error);
    throw error;
  }
}

/**
 * Updates a price and automatically records the change in history
 */
export async function updatePriceWithHistory({
  itemName,
  tier,
  newPrice,
  userId,
}: {
  itemName: string;
  tier: number;
  newPrice: number;
  userId: string;
}) {
  try {
    // Get the current price first
    const existingPrice = await prisma.pricing.findUnique({
      where: {
        itemName_tier: {
          itemName,
          tier,
        },
      },
    });

    let changeType: "created" | "updated" = "created";
    let previousPrice: number | undefined;

    if (existingPrice) {
      changeType = "updated";
      previousPrice = existingPrice.price;
    }

    // Update or create the price
    const updatedPrice = await prisma.pricing.upsert({
      where: {
        itemName_tier: {
          itemName,
          tier,
        },
      },
      update: {
        price: newPrice,
        updatedAt: new Date(),
        createdBy: userId,
      },
      create: {
        itemName,
        tier,
        price: newPrice,
        createdBy: userId,
      },
    });

    // Record the change in history
    await recordPriceChange({
      itemName,
      tier,
      newPrice,
      previousPrice,
      changeType,
      userId,
    });

    return updatedPrice;
  } catch (error) {
    console.error("Error updating price with history:", error);
    throw error;
  }
}

/**
 * Deletes a price and records the deletion in history
 */
export async function deletePriceWithHistory({
  itemName,
  tier,
  userId,
}: {
  itemName: string;
  tier: number;
  userId: string;
}) {
  try {
    // Get the current price first
    const existingPrice = await prisma.pricing.findUnique({
      where: {
        itemName_tier: {
          itemName,
          tier,
        },
      },
    });

    if (!existingPrice) {
      throw new Error("Price not found");
    }

    // Delete the price
    await prisma.pricing.delete({
      where: {
        itemName_tier: {
          itemName,
          tier,
        },
      },
    });

    // Record the deletion in history
    await recordPriceChange({
      itemName,
      tier,
      newPrice: 0, // Use 0 to indicate deletion
      previousPrice: existingPrice.price,
      changeType: "deleted",
      userId,
    });

    return existingPrice;
  } catch (error) {
    console.error("Error deleting price with history:", error);
    throw error;
  }
}

/**
 * Gets price history for a specific item and tier
 */
export async function getPriceHistory({
  itemName,
  tier,
  days = 30,
}: {
  itemName: string;
  tier: number;
  days?: number;
}) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await prisma.priceHistory.findMany({
      where: {
        itemName,
        tier,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        creator: {
          select: {
            name: true,
            discordName: true,
          },
        },
      },
    });

    return history;
  } catch (error) {
    console.error("Error fetching price history:", error);
    throw error;
  }
}
