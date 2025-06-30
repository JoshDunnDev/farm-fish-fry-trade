import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

// GET - Fetch all orders for admin management
export async function GET(request: NextRequest) {
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

    // Fetch all orders with creator and claimer information
    const orders = await prisma.order.findMany({
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
      orderBy: {
        createdAt: "desc", // Most recent first
      },
    });

    return NextResponse.json({
      success: true,
      orders,
      totalCount: orders.length,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 