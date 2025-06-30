"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { notificationManager } from "@/lib/notifications";

export default function TestNotificationsPage() {
  const testOrderDetails = {
    itemName: "Test Fish",
    tier: 3,
    amount: 50,
    orderType: "BUY" as const,
  };

  const handleTestNotification = (type: string) => {
    const settings = notificationManager.getSettings();
    if (!settings.enabled) {
      alert(
        "Notifications are disabled in your profile settings. Enable them to test notifications."
      );
      return;
    }

    const orderId = `test-order-${Date.now()}`;

    switch (type) {
      case "claimed":
        notificationManager.orderClaimed(
          orderId,
          testOrderDetails,
          "TestPlayer123"
        );
        break;
      case "ready":
        notificationManager.orderReady(orderId, testOrderDetails);
        break;

      case "cancelled":
        notificationManager.orderCancelled(orderId, testOrderDetails);
        break;
    }
  };

  const handleClearAll = () => {
    notificationManager.clearAll();
  };

  const testSSEConnection = async () => {
    try {
      const response = await fetch("/api/notifications/stream");
      if (response.ok) {
        alert("SSE endpoint is accessible!");
      } else {
        alert("SSE endpoint returned error: " + response.status);
      }
    } catch (error) {
      alert("SSE connection test failed: " + error);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Test Notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Test the notification system with different order status changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Testing</CardTitle>
          <CardDescription>
            Click the buttons below to trigger different types of notifications.
            Check the notification bell in the top right corner to see them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => handleTestNotification("claimed")}
              className="bg-primary/80 hover:bg-primary text-primary-foreground"
            >
              Order Claimed
            </Button>

            <Button
              onClick={() => handleTestNotification("ready")}
              className="bg-yellow-500/80 hover:bg-yellow-500 text-black"
            >
              Order Ready
            </Button>

            <Button
              onClick={() => handleTestNotification("cancelled")}
              className="bg-destructive/80 hover:bg-destructive text-destructive-foreground"
            >
              Order Cancelled
            </Button>
          </div>

          <div className="pt-4 border-t border-muted-foreground/20 space-y-2">
            <Button
              onClick={handleClearAll}
              variant="outline"
              className="w-full"
            >
              Clear All Notifications
            </Button>

            <Button
              onClick={testSSEConnection}
              variant="outline"
              className="w-full"
            >
              Test SSE Connection
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-2 pt-4">
            <h4 className="font-medium">Features:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Audio notifications with different sounds for each type</li>
              <li>Visual notifications in the navigation bar</li>
              <li>Database-synced settings across devices</li>
              <li>Browser notifications (if permission granted)</li>
              <li>Real-time monitoring via Server-Sent Events (SSE)</li>
              <li>Manage notification preferences in your profile settings</li>
            </ul>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-muted-foreground/20">
              <p className="text-sm">
                <strong>Note:</strong> You can enable/disable notifications and
                audio alerts in your{" "}
                <a href="/profile" className="text-primary hover:underline">
                  profile settings
                </a>
                . These preferences will sync across all your devices.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
