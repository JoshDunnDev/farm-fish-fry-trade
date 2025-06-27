import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({
        error: "No session found",
        session: null,
        user: null,
      });
    }

    let user = null;
    if (session.user?.discordId) {
      try {
        user = await prisma.user.findUnique({
          where: { discordId: session.user.discordId },
          select: {
            id: true,
            name: true,
            email: true,
            discordId: true,
            discordName: true,
            createdAt: true,
          },
        });
      } catch (prismaError) {
        return NextResponse.json({
          session,
          user: null,
          prismaError:
            prismaError instanceof Error
              ? prismaError.message
              : "Unknown Prisma error",
        });
      }
    }

    return NextResponse.json({
      session: {
        user: session.user,
        expires: session.expires,
      },
      user,
      userFound: !!user,
      discordId: session.user?.discordId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get session debug info",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
