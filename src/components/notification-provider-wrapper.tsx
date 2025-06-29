"use client";

import { useSessionContext } from "@/contexts/SessionContext";
import { useNotificationSync } from "@/hooks/useNotificationSync";
import { useSSENotifications } from "@/hooks/useSSENotifications";

export function NotificationProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useSessionContext();

  // Sync notification settings from database
  useNotificationSync();

  // Use SSE for real-time notifications
  useSSENotifications();

  return <>{children}</>;
}
