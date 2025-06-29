import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NotificationService } from "@/lib/notification-service";

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orderId = params.id;
    const { tier, pricePerUnit, amount, orderType } = await request.json();

    // Get user
    const user = await prisma.user.findUnique({
      where: { discordId: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if order exists and user owns it
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
        { error: "You can only edit your own orders" },
        { status: 403 }
      );
    }

    // Allow editing OPEN, IN_PROGRESS, and READY_TO_TRADE orders
    // But not FULFILLED orders (completed trades)
    if (order.status === "FULFILLED") {
      return NextResponse.json(
        { error: "Cannot edit completed orders" },
        { status: 400 }
      );
    }

    // Validate input
    const updateData: any = {};

    if (tier !== undefined) {
      if (typeof tier !== "number" || tier < 1 || tier > 10) {
        return NextResponse.json(
          { error: "Tier must be a number between 1 and 10" },
          { status: 400 }
        );
      }
      updateData.tier = tier;
    }

    if (pricePerUnit !== undefined) {
      const price = parseFloat(pricePerUnit);
      if (isNaN(price) || price <= 0) {
        return NextResponse.json(
          { error: "Price must be a positive number" },
          { status: 400 }
        );
      }
      updateData.pricePerUnit = price;
    }

    if (amount !== undefined) {
      const qty = parseInt(amount);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json(
          { error: "Amount must be a positive integer" },
          { status: 400 }
        );
      }
      updateData.amount = qty;
    }

    if (orderType !== undefined) {
      if (!["BUY", "SELL"].includes(orderType)) {
        return NextResponse.json(
          { error: "Order type must be BUY or SELL" },
          { status: 400 }
        );
      }
      updateData.orderType = orderType;
    }

    // Handle status logic when order type changes
    let statusChanged = false;
    let previousStatus = order.status;
    if (orderType !== undefined && orderType !== order.orderType) {
      // If order type is changing and order is already claimed, update status accordingly
      if (order.status === "IN_PROGRESS" && orderType === "SELL") {
        // Changing from BUY to SELL while in progress - should be ready to trade
        updateData.status = "READY_TO_TRADE";
        statusChanged = true;
      } else if (order.status === "READY_TO_TRADE" && orderType === "BUY") {
        // Changing from SELL to BUY while ready - should be in progress
        updateData.status = "IN_PROGRESS";
        statusChanged = true;
      }
    }

    // Add updated timestamp
    updateData.updatedAt = new Date();

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        creator: true,
        claimer: true,
      },
    });

    // Send notification if status changed due to order type change
    if (statusChanged && updatedOrder.claimerId) {
      await NotificationService.handleOrderUpdate(
        orderId,
        updatedOrder.status,
        previousStatus
      );
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error editing order:", error);
    return NextResponse.json(
      { error: "Failed to edit order" },
      { status: 500 }
    );
  }
}
