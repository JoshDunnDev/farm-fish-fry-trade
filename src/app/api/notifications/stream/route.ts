import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Store active SSE connections
// Use globalThis to persist connections across hot reloads in development
const globalForConnections = globalThis as unknown as {
  sseConnections: Map<string, ReadableStreamDefaultController> | undefined;
};

const connections =
  globalForConnections.sseConnections ??
  new Map<string, ReadableStreamDefaultController>();
globalForConnections.sseConnections = connections;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Store connection for this user
      connections.set(userId, controller);

      // Send initial connection message
      controller.enqueue(
        `data: ${JSON.stringify({
          type: "connected",
          timestamp: new Date().toISOString(),
        })}\n\n`
      );

      // Send keep-alive every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(
            `data: ${JSON.stringify({
              type: "ping",
              timestamp: new Date().toISOString(),
            })}\n\n`
          );
        } catch (error) {
          clearInterval(keepAlive);
          connections.delete(userId);
        }
      }, 30000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        connections.delete(userId);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });
    },
    cancel() {
      connections.delete(userId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

// Function to send notification to specific user
export function sendNotificationToUser(userId: string, notification: any) {
  const controller = connections.get(userId);
  if (controller) {
    try {
      controller.enqueue(`data: ${JSON.stringify(notification)}\n\n`);
    } catch (error) {
      console.error("Failed to send notification to user:", userId, error);
      connections.delete(userId);
    }
  }
}

// Function to broadcast to all connected users
export function broadcastNotification(notification: any) {
  connections.forEach((controller, userId) => {
    try {
      controller.enqueue(`data: ${JSON.stringify(notification)}\n\n`);
    } catch (error) {
      console.error("Failed to broadcast to user:", userId, error);
      connections.delete(userId);
    }
  });
}
