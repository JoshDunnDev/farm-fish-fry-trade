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

    // Check if order exists and user can mark it as ready
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { creator: true, claimer: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Order must be in progress to mark as ready" },
        { status: 400 }
      );
    }

    // Only the claimer (person fulfilling the order) can mark it as ready
    if (order.claimerId !== user.id) {
      return NextResponse.json(
        { error: "Only the person fulfilling the order can mark it as ready" },
        { status: 400 }
      );
    }

    // Mark the order as ready to trade
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "READY_TO_TRADE",
        updatedAt: new Date(),
      },
      include: {
        creator: true,
        claimer: true,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error marking order as ready:", error);
    return NextResponse.json(
      { error: "Failed to mark order as ready" },
      { status: 500 }
    );
  }
} 