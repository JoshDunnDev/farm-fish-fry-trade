"use client";

import { useEffect } from "react";
import { useSessionContext } from "@/contexts/SessionContext";
import { notificationManager } from "@/lib/notifications";

export function useNotificationSync() {
  const { session } = useSessionContext();

  useEffect(() => {
    if (
      session?.user?.notificationsEnabled !== undefined &&
      session?.user?.audioEnabled !== undefined
    ) {
      // Sync settings from database
      notificationManager.syncFromDatabase({
        enabled: session.user.notificationsEnabled,
        audioEnabled: session.user.audioEnabled,
      });
    }
  }, [session?.user?.notificationsEnabled, session?.user?.audioEnabled]);
}
