import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force this route to be dynamic
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemName = searchParams.get("itemName");
    const tier = searchParams.get("tier");
    const days = parseInt(searchParams.get("days") || "30");

    // Validate parameters
    if (!itemName || !tier) {
      return NextResponse.json(
        { error: "itemName and tier parameters are required" },
        { status: 400 }
      );
    }

    const tierNumber = parseInt(tier);
    if (isNaN(tierNumber)) {
      return NextResponse.json(
        { error: "tier must be a valid number" },
        { status: 400 }
      );
    }

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch price history
    const priceHistory = await prisma.priceHistory.findMany({
      where: {
        itemName,
        tier: tierNumber,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        price: true,
        previousPrice: true,
        changeType: true,
        createdAt: true,
      },
    });

    // Also get the current price from the pricing table
    const currentPricing = await prisma.pricing.findUnique({
      where: {
        itemName_tier: {
          itemName,
          tier: tierNumber,
        },
      },
      select: {
        price: true,
        updatedAt: true,
      },
    });

    // Format the response
    const historyData = priceHistory.map((entry: any) => ({
      price: entry.price,
      previousPrice: entry.previousPrice,
      changeType: entry.changeType,
      date: entry.createdAt.toISOString(),
    }));

    // Add current price as the latest point if we have pricing data
    if (currentPricing) {
      if (priceHistory.length > 0) {
        const lastHistoryEntry = priceHistory[priceHistory.length - 1];
        if (lastHistoryEntry.price !== currentPricing.price) {
          historyData.push({
            price: currentPricing.price,
            previousPrice: lastHistoryEntry.price,
            changeType: "current",
            date: currentPricing.updatedAt.toISOString(),
          });
        }
      } else {
        // If no history exists, create a baseline entry with current price
        historyData.push({
          price: currentPricing.price,
          previousPrice: null,
          changeType: "current",
          date: currentPricing.updatedAt.toISOString(),
        });
      }
    }

    return NextResponse.json({
      itemName,
      tier: tierNumber,
      days,
      currentPrice: currentPricing?.price || null,
      history: historyData,
      totalEntries: historyData.length,
    });
  } catch (error) {
    console.error("Error fetching price history:", error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
