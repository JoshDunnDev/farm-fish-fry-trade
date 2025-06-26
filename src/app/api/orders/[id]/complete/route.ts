import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
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

    // Check if order exists and user can complete it
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { creator: true, claimer: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Order is not in progress" },
        { status: 400 }
      );
    }

    // Both creator and claimer can mark as complete
    if (order.creatorId !== user.id && order.claimerId !== user.id) {
      return NextResponse.json(
        { error: "You can only complete orders you're involved in" },
        { status: 400 }
      );
    }

    // Complete the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "FULFILLED",
        fulfilledAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        creator: true,
        claimer: true,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error completing order:", error);
    return NextResponse.json(
      { error: "Failed to complete order" },
      { status: 500 }
    );
  }
}
