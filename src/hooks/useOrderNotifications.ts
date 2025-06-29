"use client";

import { useEffect, useRef } from "react";
import { useSessionContext } from "@/contexts/SessionContext";
import { notificationManager } from "@/lib/notifications";

interface Order {
  id: string;
  itemName: string;
  tier: number;
  amount: number;
  orderType: "BUY" | "SELL";
  status: "OPEN" | "IN_PROGRESS" | "READY_TO_TRADE" | "FULFILLED";
  creatorId: string;
  claimerId: string | null;
  claimer?: {
    name: string | null;
    inGameName: string | null;
  } | null;
  updatedAt: string;
}

export function useOrderNotifications() {
  const { session } = useSessionContext();
  const previousOrdersRef = useRef<Map<string, Order>>(new Map());
  const isInitializedRef = useRef(false);

  const pollForOrderUpdates = async () => {
    if (!session?.user?.id) return;

    try {
      // Fetch user's orders (both created and claimed)
      const response = await fetch("/api/orders/notifications");
      if (!response.ok) return;

      const { orders }: { orders: Order[] } = await response.json();
      const currentOrders = new Map(orders.map((order) => [order.id, order]));

      // Skip notifications on first load
      if (!isInitializedRef.current) {
        previousOrdersRef.current = currentOrders;
        isInitializedRef.current = true;
        return;
      }

      // Check for status changes
      Array.from(currentOrders.entries()).forEach(([orderId, currentOrder]) => {
        const previousOrder = previousOrdersRef.current.get(orderId);

        if (previousOrder && previousOrder.status !== currentOrder.status) {
          // Only notify about orders where the user is the creator
          if (currentOrder.creatorId === session.user.id) {
            handleOrderStatusChange(previousOrder, currentOrder);
          }
        }
      });

      // Update the reference
      previousOrdersRef.current = currentOrders;
    } catch (error) {
      console.error("Failed to poll order updates:", error);
    }
  };

  const handleOrderStatusChange = (
    previousOrder: Order,
    currentOrder: Order
  ) => {
    // Check if notifications are enabled
    const settings = notificationManager.getSettings();
    if (!settings.enabled) return;

    const orderDetails = {
      itemName: currentOrder.itemName,
      tier: currentOrder.tier,
      amount: currentOrder.amount,
      orderType: currentOrder.orderType,
    };

    switch (currentOrder.status) {
      case "IN_PROGRESS":
        if (previousOrder.status === "OPEN") {
          // Someone claimed the order
          const claimerName =
            currentOrder.claimer?.inGameName ||
            currentOrder.claimer?.name ||
            "Someone";
          notificationManager.orderClaimed(
            currentOrder.id,
            orderDetails,
            claimerName
          );
        }
        break;

      case "READY_TO_TRADE":
        if (previousOrder.status === "IN_PROGRESS") {
          // Order is ready for pickup/delivery
          notificationManager.orderReady(currentOrder.id, orderDetails);
        }
        break;

      case "FULFILLED":
        // No notification needed - completion happens immediately during trade
        break;

      case "OPEN":
        if (["IN_PROGRESS", "READY_TO_TRADE"].includes(previousOrder.status)) {
          // Order was cancelled/unclaimed
          notificationManager.orderCancelled(currentOrder.id, orderDetails);
        }
        break;
    }
  };

  useEffect(() => {
    if (!session?.user?.id) {
      // Reset state when user logs out
      previousOrdersRef.current.clear();
      isInitializedRef.current = false;
      return;
    }

    // Initial poll
    pollForOrderUpdates();

    // Set up polling interval (every 30 seconds)
    const interval = setInterval(pollForOrderUpdates, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  // Also poll when the page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session?.user?.id) {
        pollForOrderUpdates();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session?.user?.id]);
}
