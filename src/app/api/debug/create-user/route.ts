import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Create the user based on session data
    const user = await prisma.user.create({
      data: {
        name: session.user.name || "User",
        image: session.user.image,
        discordId: session.user.discordId || session.user.id,
        discordName: session.user.discordName || session.user.name,
        inGameName: session.user.inGameName,
        isAdmin: false, // Will be set to true when they use admin password
      },
    });

    return NextResponse.json({
      success: true,
      message: "User account created successfully",
      user: {
        id: user.id,
        name: user.name,
        discordId: user.discordId,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      {
        error: "Failed to create user account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
