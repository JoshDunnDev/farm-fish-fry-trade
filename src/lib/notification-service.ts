import { prisma } from "./prisma";
import { sendNotificationToUser } from "@/app/api/notifications/stream/route";

export interface OrderChangeEvent {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  creatorId: string;
  claimerId?: string | null;
  orderDetails: {
    itemName: string;
    tier: number;
    amount: number;
    orderType: string;
  };
  claimer?: {
    id: string;
    name: string | null;
    inGameName: string | null;
  } | null;
}

export class NotificationService {
  static async notifyOrderStatusChange(orderChangeEvent: OrderChangeEvent) {
    const {
      orderId,
      previousStatus,
      newStatus,
      creatorId,
      orderDetails,
      claimer,
    } = orderChangeEvent;

    // Only notify the order creator
    if (!creatorId) {
      return;
    }

    let notificationType: string;
    let title: string;
    let message: string;

    // Determine notification type based on status transition
    switch (newStatus) {
      case "IN_PROGRESS":
        if (previousStatus === "OPEN") {
          notificationType = "order_claimed";
          const claimerName = claimer?.inGameName || claimer?.name || "Someone";
          title = "Order Claimed";
          message = `${claimerName} claimed your ${orderDetails.orderType.toLowerCase()} order for ${
            orderDetails.amount
          }x ${orderDetails.itemName} (T${orderDetails.tier})`;
        } else {
          return; // Don't notify for other transitions to IN_PROGRESS
        }
        break;

      case "READY_TO_TRADE":
        if (previousStatus === "IN_PROGRESS") {
          notificationType = "order_ready";
          title = "Order Ready";
          message = `Your ${orderDetails.orderType.toLowerCase()} order for ${
            orderDetails.amount
          }x ${orderDetails.itemName} (T${
            orderDetails.tier
          }) is ready for pickup`;
        } else if (previousStatus === "OPEN") {
          // Handle SELL orders that go directly from OPEN to READY_TO_TRADE
          notificationType = "order_claimed";
          const claimerName = claimer?.inGameName || claimer?.name || "Someone";
          title = "Order Claimed & Ready";
          message = `${claimerName} claimed your ${orderDetails.orderType.toLowerCase()} order for ${
            orderDetails.amount
          }x ${orderDetails.itemName} (T${orderDetails.tier}) and it's ready for pickup`;
        } else {
          return;
        }
        break;

      case "OPEN":
        if (["IN_PROGRESS", "READY_TO_TRADE"].includes(previousStatus)) {
          notificationType = "order_cancelled";
          title = "Order Cancelled";
          message = `Your ${orderDetails.orderType.toLowerCase()} order for ${
            orderDetails.amount
          }x ${orderDetails.itemName} (T${orderDetails.tier}) was cancelled`;
        } else {
          return;
        }
        break;

      case "FULFILLED":
        // Notify when order is completed
        if (["IN_PROGRESS", "READY_TO_TRADE"].includes(previousStatus)) {
          notificationType = "order_completed";
          title = "Order Completed";
          message = `Your ${orderDetails.orderType.toLowerCase()} order for ${
            orderDetails.amount
          }x ${orderDetails.itemName} (T${orderDetails.tier}) has been completed`;
        } else {
          return;
        }
        break;

      default:
        return;
    }

    // Send SSE notification to the creator
    const notification = {
      type: "order_notification",
      notificationType,
      orderId,
      title,
      message,
      orderDetails,
      claimer,
      timestamp: new Date().toISOString(),
    };

    sendNotificationToUser(creatorId, notification);
  }

  // Helper method to be called when orders are updated
  static async handleOrderUpdate(
    orderId: string,
    newStatus: string,
    previousStatus?: string
  ) {
    try {
      // Fetch the order with related data, including creator's Discord ID
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          creator: {
            select: {
              discordId: true,
            },
          },
          claimer: {
            select: {
              id: true,
              name: true,
              inGameName: true,
            },
          },
        },
      });

      if (!order) {
        return;
      }

      // If we don't have the previous status, try to determine it
      if (!previousStatus) {
        // This is a limitation - we'd need to track status changes in a separate table
        // For now, we'll skip notifications when we don't know the previous status
        return;
      }

      // Use creator's Discord ID for SSE notifications (matches session.user.id)
      const creatorDiscordId = order.creator.discordId;
      if (!creatorDiscordId) {
        console.warn(
          `Order ${orderId} creator has no Discord ID, skipping notification`
        );
        return;
      }

      const orderChangeEvent: OrderChangeEvent = {
        orderId: order.id,
        previousStatus,
        newStatus,
        creatorId: creatorDiscordId, // Use Discord ID instead of database ID
        claimerId: order.claimerId,
        orderDetails: {
          itemName: order.itemName,
          tier: order.tier,
          amount: order.amount,
          orderType: order.orderType,
        },
        claimer: order.claimer,
      };

      await this.notifyOrderStatusChange(orderChangeEvent);
    } catch (error) {
      console.error("Failed to handle order update notification:", error);
    }
  }
}
