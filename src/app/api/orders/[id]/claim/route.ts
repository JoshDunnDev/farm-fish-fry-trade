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

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { discordId: session.user.id },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId: session.user.id,
          discordName: session.user.name || "Unknown User",
          inGameName: null,
        },
      });
    }

    // Check if order exists and is available to claim
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { creator: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "OPEN") {
      return NextResponse.json(
        { error: "Order is not available for claiming" },
        { status: 400 }
      );
    }

    if (order.creatorId === user.id) {
      return NextResponse.json(
        { error: "Cannot claim your own order" },
        { status: 400 }
      );
    }

    // Claim the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "IN_PROGRESS",
        claimerId: user.id,
        updatedAt: new Date(),
      },
      include: {
        creator: true,
        claimer: true,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error claiming order:", error);
    return NextResponse.json(
      { error: "Failed to claim order" },
      { status: 500 }
    );
  }
}
