import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NotificationService } from "@/lib/notification-service";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orderId = params.id;

    // Get user
    const user = await prisma.user.findUnique({
      where: { discordId: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if order exists and user can unclaim it
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { creator: true, claimer: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only the claimer can unclaim the order
    if (order.claimerId !== user.id) {
      return NextResponse.json(
        { error: "You can only unclaim orders you have claimed" },
        { status: 400 }
      );
    }

    // Can only unclaim orders that are IN_PROGRESS or READY_TO_TRADE
    if (!["IN_PROGRESS", "READY_TO_TRADE"].includes(order.status)) {
      return NextResponse.json(
        {
          error:
            "Can only unclaim orders that are in progress or ready to trade",
        },
        { status: 400 }
      );
    }

    const previousStatus = order.status;

    // Unclaim the order - set back to OPEN and remove claimer
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "OPEN",
        claimerId: null,
        updatedAt: new Date(),
      },
      include: {
        creator: true,
        claimer: true,
      },
    });

    // Send notification for order being unclaimed (cancelled)
    await NotificationService.handleOrderUpdate(
      orderId,
      "OPEN",
      previousStatus
    );

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error unclaiming order:", error);
    return NextResponse.json(
      { error: "Failed to unclaim order" },
      { status: 500 }
    );
  }
}
