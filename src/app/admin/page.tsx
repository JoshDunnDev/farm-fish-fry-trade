"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminAccessPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(true);
  const router = useRouter();

  // Check if user is already admin on page load
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch("/api/admin/auth");
        const data = await response.json();

        if (data.isAdmin) {
          // User is already admin, redirect to pricing page
          router.push("/admin/pricing");
          return;
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
      setCheckingStatus(false);
    };

    checkAdminStatus();
  }, [router]);

  // Show loading while checking admin status
  if (checkingStatus) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Checking admin status...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setMessage("Please enter password");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Admin access granted! Redirecting...");
        // Trigger admin status change event for other components
        window.dispatchEvent(new CustomEvent("adminStatusChanged"));
        // Redirect to admin pricing page with a shorter delay
        setTimeout(() => {
          router.push("/admin/pricing");
        }, 300);
      } else {
        setMessage(data.error || "Invalid password");
      }
    } catch (error) {
      setMessage("Error connecting to server");
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Admin Access</CardTitle>
          <CardDescription>
            Enter password to gain admin privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Checking..." : "Grant Admin Access"}
            </Button>
            {message && (
              <p
                className={`text-sm ${
                  message.includes("Error") || message.includes("Invalid")
                    ? "text-red-600"
                    : message.includes("granted")
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                {message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
