import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/notification-service";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

async function isUserAdmin(discordId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { discordId },
      select: { isAdmin: true },
    });
    return user?.isAdmin || false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// PATCH - Edit an order by ID (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.discordId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const orderId = params.id;
    const { itemName, tier, pricePerUnit, amount, orderType, status, claimerId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        creator: true,
        claimer: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Validate input
    const updateData: any = {};

    if (itemName !== undefined) {
      if (typeof itemName !== "string" || itemName.trim().length === 0) {
        return NextResponse.json(
          { error: "Item name must be a non-empty string" },
          { status: 400 }
        );
      }
      updateData.itemName = itemName.trim().toLowerCase();
    }

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

    if (status !== undefined) {
      if (!["OPEN", "IN_PROGRESS", "READY_TO_TRADE", "FULFILLED"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
      
      // For SELL orders, IN_PROGRESS is not a valid status
      if (orderType === "SELL" && status === "IN_PROGRESS") {
        return NextResponse.json(
          { error: "IN_PROGRESS status is not valid for SELL orders" },
          { status: 400 }
        );
      }
      
      // For existing SELL orders, also check this constraint
      if (existingOrder.orderType === "SELL" && status === "IN_PROGRESS") {
        return NextResponse.json(
          { error: "IN_PROGRESS status is not valid for SELL orders" },
          { status: 400 }
        );
      }
      
      updateData.status = status;
    }

    if (claimerId !== undefined) {
      if (claimerId === null || claimerId === "" || claimerId === "none") {
        updateData.claimerId = null;
      } else {
        // Verify the claimer exists
        const claimer = await prisma.user.findUnique({
          where: { id: claimerId },
        });
        if (!claimer) {
          return NextResponse.json(
            { error: "Claimer not found" },
            { status: 400 }
          );
        }
        updateData.claimerId = claimerId;
      }
    }

    // Add updated timestamp
    updateData.updatedAt = new Date();

    // Store previous status for notification
    const previousStatus = existingOrder.status;

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
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
    });

    // Send notification if status changed
    if (updateData.status && updateData.status !== previousStatus) {
      await NotificationService.notifyOrderStatusChange({
        orderId,
        previousStatus,
        newStatus: updateData.status,
        creatorId: updatedOrder.creatorId,
        claimerId: updatedOrder.claimerId,
        orderDetails: {
          itemName: updatedOrder.itemName,
          tier: updatedOrder.tier,
          amount: updatedOrder.amount,
          orderType: updatedOrder.orderType,
        },
        claimer: updatedOrder.claimer ? {
          id: updatedOrder.claimer.id,
          name: updatedOrder.claimer.discordName,
          inGameName: updatedOrder.claimer.inGameName,
        } : null,
      });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error editing order:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete an order by ID (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.discordId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        creator: {
          select: {
            discordName: true,
            inGameName: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Delete the order
    await prisma.order.delete({
      where: { id: orderId },
    });

    return NextResponse.json({
      success: true,
      message: `Order ${orderId} deleted successfully`,
      deletedOrder: {
        id: existingOrder.id,
        itemName: existingOrder.itemName,
        tier: existingOrder.tier,
        orderType: existingOrder.orderType,
        creator: existingOrder.creator.inGameName || existingOrder.creator.discordName,
      },
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 