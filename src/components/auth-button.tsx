"use client";

import { signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionContext } from "@/contexts/SessionContext";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthButton() {
  const { session, status, isAdmin } = useSessionContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsSigningOut(true);

    // Immediately navigate to signin page for instant feedback
    router.push("/auth/signin");

    try {
      // Sign out in background - NextAuth will handle session cleanup
      await signOut({ redirect: false });
    } catch (error) {
      console.error("Sign out error:", error);
      // If signout fails, we're already on signin page which is fine
    } finally {
      setIsSigningOut(false);
    }
  };

  if (status === "loading") {
    return (
      <Button
        disabled
        variant="ghost"
        className="relative h-8 w-8 rounded-full"
      >
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
      </Button>
    );
  }

  if (!session) {
    return (
      <Button onClick={() => signIn("discord")} size="sm">
        Sign in with Discord
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={session.user?.image || ""}
              alt={session.user?.name || ""}
            />
            <AvatarFallback>{session.user?.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session.user?.name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              Discord: {session.user?.discordName || session.user?.name}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/pricing">Admin Panel</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
