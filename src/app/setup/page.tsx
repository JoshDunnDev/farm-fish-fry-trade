"use client";

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
import { useSessionContext } from "@/contexts/SessionContext";

export default function SetupPage() {
  const { session, update } = useSessionContext();
  const router = useRouter();
  const [inGameName, setInGameName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // If user already has an in-game name, redirect to home
    if (session.user?.inGameName) {
      router.push("/");
      return;
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  // If user already has an in-game name, don't render the form
  if (session.user?.inGameName) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!inGameName.trim()) {
      setError("Please enter your in-game name");
      setIsLoading(false);
      return;
    }

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
        const result = await response.json();
        console.log("Profile updated successfully:", result);

        // Update the session to reflect the new in-game name
        const updatedSession = await update();
        console.log("Session updated:", updatedSession);

        // Force a hard redirect to ensure fresh session data
        window.location.href = "/";
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save in-game name");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setError("Failed to save in-game name");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={session.user?.image || ""}
                alt={session.user?.name || ""}
              />
              <AvatarFallback className="text-2xl">
                {session.user?.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-2xl">Welcome to FarmyFishFry!</CardTitle>
          <CardDescription>
            Hi {session.user?.name}! To get started, please tell us your
            BitCraft character name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inGameName">BitCraft Character Name</Label>
              <Input
                id="inGameName"
                type="text"
                placeholder="Enter your character name"
                value={inGameName}
                onChange={(e) => setInGameName(e.target.value)}
                maxLength={50}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This will be displayed on your orders and in leaderboards
              </p>
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Setting up..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
