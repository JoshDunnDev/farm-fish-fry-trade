"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";

const authPages = ["/auth/signin", "/setup"];

export function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Don't show navigation on auth pages
  if (authPages.includes(pathname)) {
    return null;
  }

  // Show loading placeholder during session loading to prevent flash
  if (status === "loading") {
    return (
      <nav className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-6">
            <div className="text-xl font-bold">FarmFishFryTrade</div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="w-12 h-4 bg-muted animate-pulse rounded"></div>
              <div className="w-20 h-4 bg-muted animate-pulse rounded"></div>
              <div className="w-12 h-4 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
          <div className="w-20 h-8 bg-muted animate-pulse rounded"></div>
        </div>
      </nav>
    );
  }

  // Don't show navigation if user is not authenticated
  if (!session) {
    return null;
  }

  return (
    <nav className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="text-xl font-bold hover:text-primary transition-colors"
          >
            FarmFishFryTrade
          </Link>
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/orders"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Orders
            </Link>
            <Link
              href="/orders/create"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Create Order
            </Link>
            <Link
              href="/profile"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Profile
            </Link>
          </div>
        </div>
        <AuthButton />
      </div>
    </nav>
  );
}
