import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/notification-service";

// Force this route to be dynamic
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderType = searchParams.get("orderType");
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const includeUserData = searchParams.get("includeUserData") === "true";

    // Get session to identify current user for user data
    const session = await getServerSession(authOptions);

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    const where: any = {};

    if (orderType && (orderType === "BUY" || orderType === "SELL")) {
      where.orderType = orderType;
    }

    if (
      status &&
      ["OPEN", "IN_PROGRESS", "READY_TO_TRADE", "FULFILLED"].includes(status)
    ) {
      where.status = status;
    }

    let currentUser = null;

    // Get current user data if requested, regardless of filtering
    if (includeUserData && session?.user?.id) {
      currentUser = await prisma.user.findUnique({
        where: { discordId: session.user.id },
        select: {
          id: true,
          discordId: true,
          discordName: true,
          inGameName: true,
        },
      });
    }

    // Only filter orders by user if userId is specifically provided
    if (userId) {
      // The userId parameter is actually the Discord ID from the session
      // We need to find the user's database ID first
      const filterUser = await prisma.user.findUnique({
        where: { discordId: userId },
        select: {
          id: true,
          discordId: true,
          discordName: true,
          inGameName: true,
        },
      });

      if (filterUser) {
        where.OR = [{ creatorId: filterUser.id }, { claimerId: filterUser.id }];
      } else {
        // If user not found, return empty array
        return NextResponse.json({
          orders: [],
          totalCount: 0,
          currentUser,
          hasMore: false,
          page,
          limit,
        });
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.order.count({ where });

    // Optimize select fields - only get what we need
    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        itemName: true,
        tier: true,
        pricePerUnit: true,
        amount: true,
        orderType: true,
        status: true,
        createdAt: true,
        fulfilledAt: true,
        creator: {
          select: {
            id: true,
            discordName: true,
            inGameName: true,
          },
        },
        claimer: {
          select: {
            id: true,
            discordName: true,
            inGameName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: limit,
    });

    const hasMore = offset + orders.length < totalCount;

    const response = {
      orders,
      totalCount,
      hasMore,
      page,
      limit,
      ...(includeUserData && currentUser && { currentUser }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { itemName, tier, pricePerUnit, amount, orderType } =
      await request.json();

    // Validate input
    if (
      !itemName ||
      typeof tier !== "number" ||
      tier < 1 ||
      tier > 10 ||
      !pricePerUnit ||
      !amount
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    if (orderType && !["BUY", "SELL"].includes(orderType)) {
      return NextResponse.json(
        { error: "Order type must be BUY or SELL" },
        { status: 400 }
      );
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { discordId: session.user.id },
    });

    if (!user) {
      // Create user if they don't exist
      user = await prisma.user.create({
        data: {
          discordId: session.user.id,
          discordName: session.user.name || "Unknown User",
          inGameName: null, // Will be set later in setup
        },
      });
    }

    const order = await prisma.order.create({
      data: {
        itemName,
        tier,
        pricePerUnit: parseFloat(pricePerUnit),
        amount: parseInt(amount),
        orderType: orderType || "BUY",
        status: "OPEN",
        creatorId: user.id,
      },
      include: {
        creator: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("id");

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { discordId: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the order to verify ownership and status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { creator: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if user owns the order
    if (order.creatorId !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own orders" },
        { status: 403 }
      );
    }

    // Allow order creators to delete orders that are OPEN, IN_PROGRESS, or READY_TO_TRADE
    // But not FULFILLED orders (completed trades)
    if (order.status === "FULFILLED") {
      return NextResponse.json(
        { error: "Cannot delete completed orders" },
        { status: 400 }
      );
    }

    // Store previous status for notifications
    const previousStatus = order.status;

    // Delete the order
    await prisma.order.delete({
      where: { id: orderId },
    });

    // If the order was claimed, notify the claimer that it was cancelled
    if (order.claimerId && previousStatus !== "OPEN") {
      await NotificationService.handleOrderUpdate(
        orderId,
        "OPEN",
        previousStatus
      );
    }

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
