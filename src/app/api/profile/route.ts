import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { inGameName, notificationsEnabled, audioEnabled } = body;

    // Validate input
    if (
      inGameName !== undefined &&
      (typeof inGameName !== "string" || inGameName.length > 50)
    ) {
      return NextResponse.json(
        { error: "Invalid in-game name" },
        { status: 400 }
      );
    }

    if (
      notificationsEnabled !== undefined &&
      typeof notificationsEnabled !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Invalid notifications setting" },
        { status: 400 }
      );
    }

    if (audioEnabled !== undefined && typeof audioEnabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid audio setting" },
        { status: 400 }
      );
    }

    // Update user profile
    const updateData: any = {};
    if (inGameName !== undefined) {
      updateData.inGameName = inGameName.trim() || null;
    }
    if (notificationsEnabled !== undefined) {
      updateData.notificationsEnabled = notificationsEnabled;
    }
    if (audioEnabled !== undefined) {
      updateData.audioEnabled = audioEnabled;
    }

    const updatedUser = await prisma.user.update({
      where: { discordId: session.user.discordId },
      data: updateData,
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        inGameName: updatedUser.inGameName,
        notificationsEnabled: updatedUser.notificationsEnabled,
        audioEnabled: updatedUser.audioEnabled,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { discordId: session.user.discordId },
      select: {
        inGameName: true,
        notificationsEnabled: true,
        audioEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        inGameName: user.inGameName,
        notificationsEnabled: user.notificationsEnabled,
        audioEnabled: user.audioEnabled,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
