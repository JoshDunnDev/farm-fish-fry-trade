"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSessionContext } from "@/contexts/SessionContext";
import { notificationManager } from "@/lib/notifications";

export function useSSENotifications() {
  const { session } = useSessionContext();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const connectingRef = useRef<boolean>(false);

  const handleOrderNotification = useCallback((data: any) => {
    const { notificationType, orderId, title, message, orderDetails } = data;

    // Check if notifications are enabled
    const settings = notificationManager.getSettings();

    if (!settings.enabled) {
      return;
    }

    switch (notificationType) {
      case "order_claimed":
        notificationManager.orderClaimed(
          orderId,
          orderDetails,
          extractClaimerName(message)
        );
        break;

      case "order_ready":
        notificationManager.orderReady(orderId, orderDetails);
        break;

      case "order_cancelled":
        notificationManager.orderCancelled(orderId, orderDetails);
        break;

      default:
        // Fallback: create a generic notification using order_claimed type
        notificationManager.addNotification({
          type: "order_claimed",
          title,
          message,
          orderId,
          orderDetails,
          playSound: true,
        });
    }
  }, []);

  const connect = useCallback(() => {
    if (!session?.user?.id) return;

    // Prevent duplicate connections
    if (connectingRef.current) {
      return;
    }

    connectingRef.current = true;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource("/api/notifications/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        connectingRef.current = false; // Reset connecting flag
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "connected":
              // Connection established
              break;

            case "ping":
              // Keep-alive message, no action needed
              break;

            case "order_notification":
              handleOrderNotification(data);
              break;

            default:
              // Unknown message type
              break;
          }
        } catch (error) {
          console.error("Failed to parse SSE message:", error, event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
        eventSource.close();
        connectingRef.current = false; // Reset connecting flag

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };
    } catch (error) {
      console.error("Failed to establish SSE connection:", error);
    }
  }, [session?.user?.id, handleOrderNotification]);

  const extractClaimerName = (message: string): string => {
    // Extract claimer name from message like "John claimed your..."
    const match = message.match(/^(.+?) claimed your/);
    return match ? match[1] : "Someone";
  };

  useEffect(() => {
    if (session?.user?.id) {
      connect();
    }

    // Cleanup on unmount or session change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [session?.user?.id, connect]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, keep connection but don't reconnect if it fails
      } else {
        // Page is visible, ensure we have a connection
        if (
          !eventSourceRef.current ||
          eventSourceRef.current.readyState === EventSource.CLOSED
        ) {
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [connect]);
}
