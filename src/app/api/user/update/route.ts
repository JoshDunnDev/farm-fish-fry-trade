import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inGameName } = await request.json();

    if (!inGameName || typeof inGameName !== "string") {
      return NextResponse.json(
        { error: "In-game name is required" },
        { status: 400 }
      );
    }

    if (inGameName.trim().length === 0) {
      return NextResponse.json(
        { error: "In-game name cannot be empty" },
        { status: 400 }
      );
    }

    if (inGameName.length > 50) {
      return NextResponse.json(
        { error: "In-game name must be 50 characters or less" },
        { status: 400 }
      );
    }

    // Update the user in the database
    const updatedUser = await prisma.user.update({
      where: {
        discordId: session.user.discordId,
      },
      data: {
        inGameName: inGameName.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        inGameName: updatedUser.inGameName,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
