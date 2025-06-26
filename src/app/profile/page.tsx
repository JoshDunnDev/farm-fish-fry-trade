"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const [inGameName, setInGameName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.inGameName) {
      setInGameName(session.user.inGameName);
    }
  }, [session?.user?.inGameName]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/user/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inGameName: inGameName.trim(),
        }),
      });

      if (response.ok) {
        // Update the session to reflect the new in-game name
        await update();
        setMessage("Profile updated successfully!");
      } else {
        const error = await response.text();
        setMessage(`Error: ${error}`);
      }
    } catch (error: any) {
      setMessage("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
              <AvatarFallback>{session.user?.name?.[0] || "U"}</AvatarFallback>
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
          <CardTitle>BitCraft Information</CardTitle>
          <CardDescription>
            Your in-game details for the FarmFishFry cohort
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {session.user?.inGameName && (
            <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
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

          <form onSubmit={handleSubmit} className="space-y-4">
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
                value={inGameName}
                onChange={(e) => setInGameName(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                This will be displayed on orders and leaderboards
              </p>
            </div>

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

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
