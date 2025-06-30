import { useState, useEffect, useCallback, useRef } from "react";
import { getPricingData, clearPricingCache, PricingData } from "@/lib/pricing";

interface UsePricingReturn {
  pricingData: PricingData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

export function usePricing(): UsePricingReturn {
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use refs to prevent duplicate calls
  const isLoadingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      const data = await getPricingData();
      setPricingData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch pricing data"
      );
      console.error("Failed to fetch pricing data:", err);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  const refetch = useCallback(async () => {
    hasInitializedRef.current = false;
    await fetchData();
  }, [fetchData]);

  const clearCache = useCallback(() => {
    clearPricingCache();
    hasInitializedRef.current = false;
    fetchData();
  }, [fetchData]);

  // Initial load - only run once
  useEffect(() => {
    if (hasInitializedRef.current) return;

    hasInitializedRef.current = true;
    fetchData();
  }, [fetchData]); // Include fetchData dependency

  return {
    pricingData,
    loading,
    error,
    refetch,
    clearCache,
  };
}

// Hook for getting available items with memoization
export function useAvailableItems(pricingData: PricingData | null) {
  return pricingData ? Object.keys(pricingData.items).sort() : [];
}

// Hook for getting available tiers for an item
export function useAvailableTiers(
  pricingData: PricingData | null,
  itemName: string
) {
  if (!pricingData || !itemName) return [];
  const item = pricingData.items[itemName];
  if (!item) return [];

  return Object.keys(item)
    .map((key) => parseInt(key.replace("tier", "")))
    .sort((a, b) => a - b);
}

// Hook for getting price for a specific item and tier
export function useItemPrice(
  pricingData: PricingData | null,
  itemName: string,
  tier: number
) {
  if (!pricingData || !itemName) return null;
  const item = pricingData.items[itemName];
  if (!item) return null;

  const tierKey = `tier${tier}`;
  return item[tierKey] || null;
}
