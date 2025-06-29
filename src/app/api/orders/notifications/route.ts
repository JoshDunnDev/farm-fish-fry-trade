import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch orders where the user is either the creator or claimer
    // We need to monitor both to detect status changes
    const orders = await prisma.order.findMany({
      where: {
        OR: [{ creatorId: session.user.id }, { claimerId: session.user.id }],
      },
      include: {
        claimer: {
          select: {
            name: true,
            inGameName: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Failed to fetch orders for notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
