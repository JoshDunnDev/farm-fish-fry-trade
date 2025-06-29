"use client";

import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { useNotificationSync } from "@/hooks/useNotificationSync";

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sync notification settings from database
  useNotificationSync();

  // Initialize order notifications monitoring
  useOrderNotifications();

  return <>{children}</>;
}
