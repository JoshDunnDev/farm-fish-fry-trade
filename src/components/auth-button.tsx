"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
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

export function AuthButton() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status when session is available
  useEffect(() => {
    async function checkAdminStatus() {
      if (session?.user) {
        try {
          const response = await fetch('/api/admin/auth');
          const data = await response.json();
          setIsAdmin(data.isAdmin);
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      }
    }

    if (status !== "loading") {
      checkAdminStatus();
    }
  }, [session, status]);

  if (status === "loading") {
    return <Button disabled>Loading...</Button>;
  }

  if (!session) {
    return (
      <Button onClick={() => signIn("discord")}>Sign in with Discord</Button>
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
              {session.user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/profile">Profile</a>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/admin/pricing">Admin Panel</a>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
