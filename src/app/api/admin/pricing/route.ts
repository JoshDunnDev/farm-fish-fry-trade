import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  updatePriceWithHistory,
  deletePriceWithHistory,
} from "@/lib/price-history";

async function isUserAdmin(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { isAdmin: true },
    });
    return user?.isAdmin || false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// GET - View current pricing data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Fetch pricing data from database ordered alphabetically by name, then by tier
    const pricingEntries = await prisma.pricing.findMany({
      orderBy: [{ itemName: "asc" }, { tier: "asc" }],
    });

    // Fetch metadata
    const metadata = await prisma.pricingMetadata.findMany();

    // Transform pricing data to the expected format
    const items: { [itemName: string]: { [tierKey: string]: number } } = {};

    pricingEntries.forEach((entry) => {
      if (!items[entry.itemName]) {
        items[entry.itemName] = {};
      }
      items[entry.itemName][`tier${entry.tier}`] = entry.price;
    });

    // Transform metadata to the expected format
    const notes: { [key: string]: string } = {};
    let lastUpdated = new Date().toISOString().split("T")[0];
    let version = "1.0.0";

    metadata.forEach((meta) => {
      if (meta.key === "lastUpdated") {
        lastUpdated = meta.value;
      } else if (meta.key === "version") {
        version = meta.value;
      } else if (meta.key.startsWith("note_")) {
        const noteKey = meta.key.replace("note_", "");
        notes[noteKey] = meta.value;
      }
    });

    const currentData = {
      lastUpdated,
      version,
      items,
      notes,
    };

    return NextResponse.json({
      success: true,
      data: currentData,
      source: "database",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Update pricing data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get the admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { items, lastUpdated, version, notes } = body;

    // Validate the structure
    if (!items || typeof items !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid pricing data: items object is required",
        },
        { status: 400 }
      );
    }

    // Use a transaction to update pricing data with history tracking
    await prisma.$transaction(async (tx) => {
      // Get existing pricing data to determine what's new vs updated
      const existingPricing = await tx.pricing.findMany();
      const existingKeys = new Set(
        existingPricing.map((p) => `${p.itemName}-${p.tier}`)
      );

      // First, handle deletions - items that are no longer present
      const newKeys = new Set();
      for (const [itemName, prices] of Object.entries(items)) {
        for (const tierKey of Object.keys(
          prices as { [key: string]: number }
        )) {
          const tier = parseInt(tierKey.replace("tier", ""));
          newKeys.add(`${itemName}-${tier}`);
        }
      }

      // Delete pricing entries that are no longer present (with history)
      for (const existing of existingPricing) {
        const key = `${existing.itemName}-${existing.tier}`;
        if (!newKeys.has(key)) {
          await deletePriceWithHistory({
            itemName: existing.itemName,
            tier: existing.tier,
            userId: adminUser.id,
          });
        }
      }

      // Update existing items and create new ones (with history)
      for (const [itemName, prices] of Object.entries(items)) {
        for (const [tierKey, price] of Object.entries(
          prices as { [key: string]: number }
        )) {
          const tier = parseInt(tierKey.replace("tier", ""));

          // Use the price history function to update/create with tracking
          await updatePriceWithHistory({
            itemName,
            tier,
            newPrice: price,
            userId: adminUser.id,
          });
        }
      }

      // Update metadata
      await tx.pricingMetadata.deleteMany();

      const metadataEntries = [
        {
          key: "lastUpdated",
          value: lastUpdated || new Date().toISOString().split("T")[0],
        },
        { key: "version", value: version || "1.0.0" },
      ];

      // Add notes
      if (notes && typeof notes === "object") {
        Object.entries(notes).forEach(([key, value]) => {
          metadataEntries.push({
            key: `note_${key}`,
            value: value as string,
          });
        });
      }

      await tx.pricingMetadata.createMany({
        data: metadataEntries,
      });
    });

    // Fetch the updated data to return
    const updatedPricingEntries = await prisma.pricing.findMany({
      orderBy: [{ itemName: "asc" }, { tier: "asc" }],
    });

    const updatedMetadata = await prisma.pricingMetadata.findMany();

    // Transform back to expected format
    const updatedItems: { [itemName: string]: { [tierKey: string]: number } } =
      {};

    updatedPricingEntries.forEach((entry) => {
      if (!updatedItems[entry.itemName]) {
        updatedItems[entry.itemName] = {};
      }
      updatedItems[entry.itemName][`tier${entry.tier}`] = entry.price;
    });

    const updatedNotes: { [key: string]: string } = {};
    let updatedLastUpdated = new Date().toISOString().split("T")[0];
    let updatedVersion = "1.0.0";

    updatedMetadata.forEach((meta) => {
      if (meta.key === "lastUpdated") {
        updatedLastUpdated = meta.value;
      } else if (meta.key === "version") {
        updatedVersion = meta.value;
      } else if (meta.key.startsWith("note_")) {
        const noteKey = meta.key.replace("note_", "");
        updatedNotes[noteKey] = meta.value;
      }
    });

    const newPricingData = {
      lastUpdated: updatedLastUpdated,
      version: updatedVersion,
      items: updatedItems,
      notes: updatedNotes,
    };

    return NextResponse.json({
      success: true,
      message: "Pricing data updated successfully",
      data: newPricingData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating pricing data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT - Update specific item prices (keeping for backward compatibility)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { itemName, prices } = body;

    if (!itemName || !prices) {
      return NextResponse.json(
        {
          success: false,
          error: "itemName and prices are required",
        },
        { status: 400 }
      );
    }

    // Update pricing for the specific item with history tracking
    await prisma.$transaction(async (tx) => {
      // Get existing prices for this item to handle deletions
      const existingPrices = await tx.pricing.findMany({
        where: { itemName },
      });

      // Delete existing prices that are no longer in the new price list
      const newTierKeys = Object.keys(prices as { [key: string]: number });
      const newTiers = newTierKeys.map((key) =>
        parseInt(key.replace("tier", ""))
      );

      for (const existing of existingPrices) {
        if (!newTiers.includes(existing.tier)) {
          await deletePriceWithHistory({
            itemName: existing.itemName,
            tier: existing.tier,
            userId: adminUser.id,
          });
        }
      }

      // Update or create new prices with history tracking
      for (const [tierKey, price] of Object.entries(
        prices as { [key: string]: number }
      )) {
        const tier = parseInt(tierKey.replace("tier", ""));
        await updatePriceWithHistory({
          itemName,
          tier,
          newPrice: price,
          userId: adminUser.id,
        });
      }

      // Update lastUpdated metadata
      await tx.pricingMetadata.upsert({
        where: { key: "lastUpdated" },
        update: { value: new Date().toISOString().split("T")[0] },
        create: {
          key: "lastUpdated",
          value: new Date().toISOString().split("T")[0],
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Updated prices for ${itemName}`,
      updatedItem: { [itemName]: prices },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
