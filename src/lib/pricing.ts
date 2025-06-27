// Client-safe pricing library
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

// Cache for pricing data (client-side)
let cachedPricing: PricingData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds cache

// Fetch pricing data from API
async function fetchPricingData(): Promise<PricingData> {
  try {
    const response = await fetch('/api/pricing/data');
    if (!response.ok) {
      throw new Error('Failed to fetch pricing data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching pricing data:', error);
    // Fallback to default pricing if API fails
    return {
      lastUpdated: new Date().toISOString().split('T')[0],
      version: "0.1.0",
      items: {
        "salt": { "tier1": 4, "tier2": 4, "tier3": 4, "tier4": 4 },
        "fish": { "tier1": 1.333, "tier2": 1.666, "tier3": 2, "tier4": 2.333 },
        "bulb": { "tier1": 0.5, "tier2": 0.625, "tier3": 0.75, "tier4": 0.875 }
      },
      notes: {
        "pricing": "Prices are in Hex Coins (HC) per piece.",
        "updates": "Update this file and call POST /api/pricing/reload to apply changes without downtime. Changes auto-reload within 30 seconds.",
        "structure": "Items are organized by name, with prices for each tier.",
        "hotReload": "Use POST /api/pricing/reload to immediately apply changes, or wait up to 30 seconds for automatic reload."
      }
    };
  }
}

// Get pricing data with caching
async function getPricingData(): Promise<PricingData> {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (cachedPricing && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedPricing;
  }
  
  // Fetch fresh data
  cachedPricing = await fetchPricingData();
  lastFetchTime = now;
  
  return cachedPricing;
}

// Force reload pricing data (for API endpoint)
export async function reloadPricingData(): Promise<PricingData> {
  cachedPricing = await fetchPricingData();
  lastFetchTime = Date.now();
  return cachedPricing;
}

// Get price for a specific item and tier
export async function getItemPrice(itemName: string, tier: number): Promise<number | null> {
  const currentPricing = await getPricingData();
  const item = currentPricing.items[itemName];
  if (!item) return null;
  
  const tierKey = `tier${tier}`;
  return item[tierKey] || null;
}

// Get all items with their prices
export async function getAllItems(): Promise<Array<{name: string, prices: {[tier: string]: number}}>> {
  const currentPricing = await getPricingData();
  return Object.entries(currentPricing.items).map(([name, prices]) => ({
    name,
    prices
  }));
}

// Get all available items (just names)
export async function getItemNames(): Promise<string[]> {
  const currentPricing = await getPricingData();
  return Object.keys(currentPricing.items).sort();
}

// Get all available tiers for a specific item
export async function getAvailableTiersForItem(itemName: string): Promise<number[]> {
  const currentPricing = await getPricingData();
  const item = currentPricing.items[itemName];
  if (!item) return [];
  
  return Object.keys(item)
    .map(key => parseInt(key.replace('tier', '')))
    .sort((a, b) => a - b);
}

// Get all tiers that have any pricing data
export async function getAvailableTiers(): Promise<number[]> {
  const currentPricing = await getPricingData();
  const allTiers = new Set<number>();
  
  Object.values(currentPricing.items).forEach(item => {
    Object.keys(item).forEach(tierKey => {
      const tier = parseInt(tierKey.replace('tier', ''));
      allTiers.add(tier);
    });
  });
  
  return Array.from(allTiers).sort((a, b) => a - b);
}

// Search items by name
export async function searchItems(query: string): Promise<Array<{name: string, prices: {[tier: string]: number}}>> {
  const lowercaseQuery = query.toLowerCase();
  const allItems = await getAllItems();
  
  return allItems.filter(item => 
    item.name.toLowerCase().includes(lowercaseQuery)
  );
}

// Get price suggestion for order creation
export async function getPriceSuggestion(itemName: string, tier: number): Promise<{
  suggested: number;
  found: boolean;
}> {
  const price = await getItemPrice(itemName, tier);
  
  if (price !== null) {
    return {
      suggested: price,
      found: true
    };
  }
  
  return {
    suggested: 1.0,
    found: false
  };
}

// Get pricing metadata
export async function getPricingMetadata(): Promise<{
  lastUpdated: string;
  version: string;
  notes: {[key: string]: string};
}> {
  const currentPricing = await getPricingData();
  return {
    lastUpdated: currentPricing.lastUpdated,
    version: currentPricing.version,
    notes: currentPricing.notes
  };
}

// Format price with HC suffix
export function formatPrice(price: number): string {
  return price % 1 === 0 ? `${price.toFixed(0)} HC` : `${price.toFixed(3).replace(/\.?0+$/, '')} HC`;
} 