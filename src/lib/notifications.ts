// Notification types for different order events
export type NotificationType =
  | "order_claimed"
  | "order_ready"
  | "order_completed"
  | "order_cancelled"
  | "new_order_created";

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId: string;
  orderDetails?: {
    itemName: string;
    tier: number;
    amount: number;
    orderType: "BUY" | "SELL";
    claimedBy?: string;
  };
  timestamp: Date;
  read: boolean;
  playSound: boolean;
}

// Audio notification class
class AudioNotifications {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  constructor() {
    // Initialize audio context on user interaction
    if (typeof window !== "undefined") {
      this.initAudioContext();
    }
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn("Audio notifications not supported:", error);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private createBeep(
    frequency: number,
    duration: number,
    volume: number = 0.1
  ) {
    if (!this.audioContext || !this.enabled) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      volume,
      this.audioContext.currentTime + 0.01
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playNotificationSound(type: NotificationType) {
    if (!this.enabled) return;

    switch (type) {
      case "order_claimed":
        // Double beep - someone claimed your order
        this.createBeep(800, 0.2);
        setTimeout(() => this.createBeep(800, 0.2), 250);
        break;

      case "order_ready":
        // Triple ascending beep - order ready for pickup
        this.createBeep(600, 0.15);
        setTimeout(() => this.createBeep(700, 0.15), 200);
        setTimeout(() => this.createBeep(800, 0.15), 400);
        break;

      case "order_completed":
        // Success chime - order completed
        this.createBeep(523, 0.2); // C
        setTimeout(() => this.createBeep(659, 0.2), 200); // E
        setTimeout(() => this.createBeep(784, 0.3), 400); // G
        break;

      case "order_cancelled":
        // Low descending beep - order cancelled
        this.createBeep(400, 0.3);
        setTimeout(() => this.createBeep(300, 0.3), 200);
        break;

      default:
        // Default single beep
        this.createBeep(600, 0.2);
    }
  }
}

// Notification settings interface
export interface NotificationSettings {
  enabled: boolean;
  audioEnabled: boolean;
}

// Notification manager class
class NotificationManager {
  private notifications: NotificationData[] = [];
  private listeners: ((notifications: NotificationData[]) => void)[] = [];
  private audio = new AudioNotifications();
  private storageKey = "farmy-notifications";
  private settingsKey = "notification-settings";
  private settings: NotificationSettings = {
    enabled: true,
    audioEnabled: true,
  };

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
      this.loadSettings();
      this.requestPermission();
    }
  }

  private async requestPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.notifications = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
      }
    } catch (error) {
      console.warn("Failed to load notifications from storage:", error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.notifications));
    } catch (error) {
      console.warn("Failed to save notifications to storage:", error);
    }
  }

  private loadSettings() {
    try {
      const stored = localStorage.getItem(this.settingsKey);
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
        this.audio.setEnabled(this.settings.audioEnabled);
      }
    } catch (error) {
      console.warn("Failed to load notification settings:", error);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
    } catch (error) {
      console.warn("Failed to save notification settings:", error);
    }
  }

  subscribe(listener: (notifications: NotificationData[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.notifications]));
    this.saveToStorage();
  }

  addNotification(data: Omit<NotificationData, "id" | "timestamp" | "read">) {
    // Don't add notifications if globally disabled
    if (!this.settings.enabled) {
      return null;
    }

    const notification: NotificationData = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    this.notifications.unshift(notification);

    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    // Play sound if enabled
    if (notification.playSound && this.settings.audioEnabled) {
      this.audio.playNotificationSound(notification.type);
    }

    // Show browser notification
    this.showBrowserNotification(notification);

    this.notify();
    return notification;
  }

  private showBrowserNotification(notification: NotificationData) {
    if ("Notification" in window && Notification.permission === "granted") {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico",
        tag: notification.orderId, // Prevent duplicate notifications for same order
      });

      // Auto-close after 5 seconds
      setTimeout(() => browserNotification.close(), 5000);
    }
  }

  markAsRead(id: string) {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) {
      notification.read = true;
      this.notify();
    }
  }

  markAllAsRead() {
    this.notifications.forEach((n) => (n.read = true));
    this.notify();
  }

  removeNotification(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notify();
  }

  clearAll() {
    this.notifications = [];
    this.notify();
  }

  getUnreadCount() {
    return this.notifications.filter((n) => !n.read).length;
  }

  getNotifications() {
    return [...this.notifications];
  }

  setAudioEnabled(enabled: boolean) {
    this.settings.audioEnabled = enabled;
    this.audio.setEnabled(enabled);
    this.saveSettings();
  }

  setNotificationsEnabled(enabled: boolean) {
    this.settings.enabled = enabled;
    this.saveSettings();
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.audio.setEnabled(this.settings.audioEnabled);
    this.saveSettings();
  }

  // Sync settings from database (called when user profile is loaded)
  syncFromDatabase(dbSettings: NotificationSettings) {
    this.settings = { ...dbSettings };
    this.audio.setEnabled(this.settings.audioEnabled);
    this.saveSettings();
  }

  // Helper methods for creating specific notification types
  orderClaimed(
    orderId: string,
    orderDetails: NotificationData["orderDetails"],
    claimedBy: string
  ) {
    return this.addNotification({
      type: "order_claimed",
      title: "Order Claimed!",
      message: `${claimedBy} claimed your ${orderDetails?.orderType.toLowerCase()} order for T${
        orderDetails?.tier
      } ${orderDetails?.itemName}`,
      orderId,
      orderDetails: { ...orderDetails!, claimedBy },
      playSound: true,
    });
  }

  orderReady(orderId: string, orderDetails: NotificationData["orderDetails"]) {
    return this.addNotification({
      type: "order_ready",
      title: "Order Ready!",
      message: `Your ${orderDetails?.orderType.toLowerCase()} order for T${
        orderDetails?.tier
      } ${orderDetails?.itemName} is ready for pickup`,
      orderId,
      orderDetails,
      playSound: true,
    });
  }

  orderCompleted(
    orderId: string,
    orderDetails: NotificationData["orderDetails"]
  ) {
    return this.addNotification({
      type: "order_completed",
      title: "Order Completed!",
      message: `Your ${orderDetails?.orderType.toLowerCase()} order for T${
        orderDetails?.tier
      } ${orderDetails?.itemName} has been completed`,
      orderId,
      orderDetails,
      playSound: true,
    });
  }

  orderCancelled(
    orderId: string,
    orderDetails: NotificationData["orderDetails"]
  ) {
    return this.addNotification({
      type: "order_cancelled",
      title: "Order Cancelled",
      message: `Your ${orderDetails?.orderType.toLowerCase()} order for T${
        orderDetails?.tier
      } ${orderDetails?.itemName} was cancelled`,
      orderId,
      orderDetails,
      playSound: true,
    });
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();

// Helper function to format notification messages
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case "order_claimed":
      return "•";
    case "order_ready":
      return "•";
    case "order_completed":
      return "•";
    case "order_cancelled":
      return "•";
    case "new_order_created":
      return "•";
    default:
      return "•";
  }
}

export function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case "order_claimed":
      return "blue";
    case "order_ready":
      return "yellow";
    case "order_completed":
      return "green";
    case "order_cancelled":
      return "red";
    case "new_order_created":
      return "purple";
    default:
      return "gray";
  }
}
