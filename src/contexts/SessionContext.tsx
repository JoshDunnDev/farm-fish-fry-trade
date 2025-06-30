"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useSession as useNextAuthSession } from "next-auth/react";

interface SessionContextType {
  session: any;
  status: string;
  isAdmin: boolean;
  adminLoading: boolean;
  update: () => Promise<any>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useNextAuthSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  // Use refs to prevent duplicate admin checks
  const isCheckingAdminRef = useRef(false);
  const hasCheckedAdminRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);

  const checkAdminStatus = useCallback(async () => {
    if (!session?.user || isCheckingAdminRef.current) return;

    // Check if this is the same session we already checked
    const currentSessionId = session.user.id || session.user.discordId || null;
    if (
      hasCheckedAdminRef.current &&
      lastSessionIdRef.current === currentSessionId
    ) {
      return;
    }

    try {
      isCheckingAdminRef.current = true;
      setAdminLoading(true);

      const response = await fetch("/api/admin/auth");
      const data = await response.json();
      setIsAdmin(data.isAdmin);
      hasCheckedAdminRef.current = true;
      lastSessionIdRef.current = currentSessionId;
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
      isCheckingAdminRef.current = false;
    }
  }, [session]);

  // Check admin status when session changes
  useEffect(() => {
    if (status === "loading") return;

    if (session?.user) {
      const currentSessionId =
        session.user.id || session.user.discordId || null;
      // Only check if we haven't checked this session before
      if (
        !hasCheckedAdminRef.current ||
        lastSessionIdRef.current !== currentSessionId
      ) {
        checkAdminStatus();
      }
    } else {
      // Reset admin state when logged out
      setIsAdmin(false);
      hasCheckedAdminRef.current = false;
      lastSessionIdRef.current = null;
    }
  }, [session, status, checkAdminStatus]);

  // Listen for admin status changes (from admin access page)
  useEffect(() => {
    const handleAdminStatusChanged = () => {
      // Force a fresh admin check
      hasCheckedAdminRef.current = false;
      lastSessionIdRef.current = null;
      if (session?.user) {
        checkAdminStatus();
      }
    };

    window.addEventListener("adminStatusChanged", handleAdminStatusChanged);

    return () => {
      window.removeEventListener(
        "adminStatusChanged",
        handleAdminStatusChanged
      );
    };
  }, [session, checkAdminStatus]);

  const value = {
    session,
    status,
    isAdmin,
    adminLoading,
    update,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return context;
}
