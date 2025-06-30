// Client-safe pricing library with caching
export interface PricingData {
  lastUpdated: string;
  version: string;
  items: {
    [itemName: string]: {
      [tierKey: string]: number;
    };
  };
  notes: {
    [key: string]: string;
  };
}

// In-memory cache for pricing data
let pricingCache: {
  data: PricingData | null;
  timestamp: number;
  expiry: number;
} = {
  data: null,
  timestamp: 0,
  expiry: 5 * 60 * 1000, // 5 minutes cache
};

// Fetch pricing data from API with caching
async function fetchPricingData(): Promise<PricingData> {
  const now = Date.now();

  // Return cached data if still valid
  if (pricingCache.data && now - pricingCache.timestamp < pricingCache.expiry) {
    return pricingCache.data;
  }

  const response = await fetch("/api/pricing/data");
  if (!response.ok) {
    throw new Error("Failed to fetch pricing data");
  }

  const data = await response.json();

  // Update cache
  pricingCache = {
    data,
    timestamp: now,
    expiry: pricingCache.expiry,
  };

  return data;
}

// Get pricing data with caching
export async function getPricingData(): Promise<PricingData> {
  return await fetchPricingData();
}

// Clear the pricing cache (useful after updates)
export function clearPricingCache(): void {
  pricingCache.data = null;
  pricingCache.timestamp = 0;
}

// Get price for a specific item and tier
export async function getItemPrice(
  itemName: string,
  tier: number
): Promise<number | null> {
  const currentPricing = await getPricingData();
  const item = currentPricing.items[itemName];
  if (!item) return null;

  const tierKey = `tier${tier}`;
  return item[tierKey] || null;
}

// Get all items with their prices
export async function getAllItems(): Promise<
  Array<{ name: string; prices: { [tier: string]: number } }>
> {
  const currentPricing = await getPricingData();
  return Object.entries(currentPricing.items).map(([name, prices]) => ({
    name,
    prices,
  }));
}

// Get all available items (just names)
export async function getItemNames(): Promise<string[]> {
  const currentPricing = await getPricingData();
  return Object.keys(currentPricing.items).sort();
}

// Get all available tiers for a specific item
export async function getAvailableTiersForItem(
  itemName: string
): Promise<number[]> {
  const currentPricing = await getPricingData();
  const item = currentPricing.items[itemName];
  if (!item) return [];

  return Object.keys(item)
    .map((key) => parseInt(key.replace("tier", "")))
    .sort((a, b) => a - b);
}

// Get all tiers that have any pricing data
export async function getAvailableTiers(): Promise<number[]> {
  const currentPricing = await getPricingData();
  const allTiers = new Set<number>();

  Object.values(currentPricing.items).forEach((item) => {
    Object.keys(item).forEach((tierKey) => {
      const tier = parseInt(tierKey.replace("tier", ""));
      allTiers.add(tier);
    });
  });

  return Array.from(allTiers).sort((a, b) => a - b);
}

// Search items by name
export async function searchItems(
  query: string
): Promise<Array<{ name: string; prices: { [tier: string]: number } }>> {
  const lowercaseQuery = query.toLowerCase();
  const allItems = await getAllItems();

  return allItems.filter((item) =>
    item.name.toLowerCase().includes(lowercaseQuery)
  );
}

// Format price consistently across the app
export function formatPrice(price: number): string {
  // Remove unnecessary trailing zeros and add HC suffix
  return price % 1 === 0
    ? `${price.toFixed(0)} HC`
    : `${price.toFixed(3).replace(/\.?0+$/, "")} HC`;
}

// Format price as whole HC values (for stats/summary displays)
export function formatPriceWhole(price: number): string {
  return `${Math.round(price).toLocaleString()} HC`;
}

// Get price suggestion for order creation
export async function getPriceSuggestion(
  itemName: string,
  tier: number
): Promise<{
  suggested: number;
  found: boolean;
}> {
  const price = await getItemPrice(itemName, tier);

  if (price !== null) {
    return {
      suggested: price,
      found: true,
    };
  }

  return {
    suggested: 1.0,
    found: false,
  };
}

// Get pricing metadata
export async function getPricingMetadata(): Promise<{
  lastUpdated: string;
  version: string;
  notes: { [key: string]: string };
}> {
  const currentPricing = await getPricingData();
  return {
    lastUpdated: currentPricing.lastUpdated,
    version: currentPricing.version,
    notes: currentPricing.notes,
  };
}
