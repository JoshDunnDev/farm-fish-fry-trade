"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSessionContext } from "@/contexts/SessionContext";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

interface ProfileData {
  inGameName: string;
  notificationsEnabled: boolean;
  audioEnabled: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { session, status } = useSessionContext();
  const [profileData, setProfileData] = useState<ProfileData>({
    inGameName: "",
    notificationsEnabled: true,
    audioEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  // Handle authentication redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Load profile data
  useEffect(() => {
    if (session?.user) {
      const loadProfileData = async () => {
        try {
          const response = await fetch("/api/profile");
          if (response.ok) {
            const data = await response.json();
            setProfileData({
              inGameName: data.user.inGameName || "",
              notificationsEnabled: data.user.notificationsEnabled,
              audioEnabled: data.user.audioEnabled,
            });
          }
        } catch (error) {
          console.error("Failed to load profile data:", error);
        }
      };

      loadProfileData();
    }
  }, [session]);

  if (status === "loading") {
    return <LoadingSpinner message="Loading your profile..." />;
  }

  if (!session) {
    return <LoadingSpinner message="Redirecting to sign in..." />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Profile updated successfully!");
        // Settings will be reflected on next page load/session refresh
      } else {
        setMessage(`Error: ${data.error || "Failed to update profile"}`);
      }
    } catch (error) {
      setMessage("Error: Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof ProfileData,
    value: string | boolean
  ) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Discord Information</CardTitle>
            <CardDescription>Your Discord account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={session.user?.image || ""}
                  alt={session.user?.name || ""}
                />
                <AvatarFallback>
                  {session.user?.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-medium">{session.user?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Discord ID: {session.user?.discordId}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Update your in-game information and notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* In-Game Name Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">BitCraft Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Your in-game details for the FarmFishFry cohort
                  </p>
                </div>

                {session.user?.inGameName && (
                  <div className="flex items-center p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Current BitCraft Character
                      </p>
                      <p className="text-lg font-semibold">
                        {session.user.inGameName}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="inGameName">
                    {session.user?.inGameName
                      ? "Update In-Game Name"
                      : "Set In-Game Name"}
                  </Label>
                  <Input
                    id="inGameName"
                    type="text"
                    placeholder="Enter your BitCraft character name"
                    value={profileData.inGameName}
                    onChange={(e) =>
                      handleInputChange("inGameName", e.target.value)
                    }
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be displayed on orders and leaderboards
                  </p>
                </div>
              </div>

              {/* Notification Settings Section */}
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h3 className="text-lg font-medium">Notification Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your notification preferences for order updates
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notifications-enabled">
                        Enable Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for order status changes
                      </p>
                    </div>
                    <Switch
                      id="notifications-enabled"
                      checked={profileData.notificationsEnabled}
                      onCheckedChange={(checked) =>
                        handleInputChange("notificationsEnabled", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="audio-enabled">Audio Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Play sounds when notifications arrive
                      </p>
                    </div>
                    <Switch
                      id="audio-enabled"
                      checked={profileData.audioEnabled}
                      onCheckedChange={(checked) =>
                        handleInputChange("audioEnabled", checked)
                      }
                      disabled={!profileData.notificationsEnabled}
                    />
                  </div>

                  {!profileData.notificationsEnabled && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        You won't receive any notifications while they're
                        disabled. This includes browser notifications, audio
                        alerts, and the notification center.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Message and Submit */}
              {message && (
                <div
                  className={`text-sm ${
                    message.includes("Error")
                      ? "text-destructive"
                      : "text-green-600"
                  }`}
                >
                  {message}
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
