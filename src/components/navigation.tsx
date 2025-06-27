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
            <div className="text-xl font-bold">FarmyFishFry</div>
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
          <Link href="/" className="text-xl font-bold">
            FarmyFishFry
          </Link>
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/orders"
              className={`text-sm font-medium transition-colors ${
                pathname === "/orders"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Orders
            </Link>
            <Link
              href="/orders/create"
              className={`text-sm font-medium transition-colors ${
                pathname === "/orders/create"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Order
            </Link>
            <Link
              href="/pricing"
              className={`text-sm font-medium transition-colors ${
                pathname === "/pricing"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/stats"
              className={`text-sm font-medium transition-colors ${
                pathname === "/stats"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Stats
            </Link>
            <Link
              href="/profile"
              className={`text-sm font-medium transition-colors ${
                pathname === "/profile"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Profile
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
