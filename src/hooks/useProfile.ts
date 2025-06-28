import { useState, useEffect, useCallback, useRef } from "react";
import { useSessionContext } from "@/contexts/SessionContext";

interface UseProfileReturn {
  inGameName: string;
  setInGameName: (name: string) => void;
  isLoading: boolean;
  message: string;
  updateProfile: (newInGameName: string) => Promise<void>;
  clearMessage: () => void;
}

export function useProfile(): UseProfileReturn {
  const { session, update } = useSessionContext();
  const [inGameName, setInGameName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Use refs to prevent duplicate operations
  const isUpdatingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Initialize in-game name from session
  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (session?.user?.inGameName) {
      setInGameName(session.user.inGameName);
      hasInitializedRef.current = true;
    }
  }, [session?.user?.inGameName]);

  const updateProfile = useCallback(
    async (newInGameName: string) => {
      if (isUpdatingRef.current) return;

      isUpdatingRef.current = true;
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch("/api/user/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inGameName: newInGameName.trim(),
          }),
        });

        if (response.ok) {
          // Update the session to reflect the new in-game name
          await update();
          setMessage("Profile updated successfully!");
          setInGameName(newInGameName.trim());

          // Clear success message after 3 seconds
          setTimeout(() => {
            setMessage("");
          }, 3000);
        } else {
          const error = await response.text();
          setMessage(`Error: ${error}`);
        }
      } catch (error) {
        setMessage("Failed to update profile");
        console.error("Profile update error:", error);
      } finally {
        setIsLoading(false);
        isUpdatingRef.current = false;
      }
    },
    [update]
  );

  const clearMessage = useCallback(() => {
    setMessage("");
  }, []);

  return {
    inGameName,
    setInGameName,
    isLoading,
    message,
    updateProfile,
    clearMessage,
  };
}
