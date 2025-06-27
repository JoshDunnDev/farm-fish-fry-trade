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

// Fetch pricing data from API (no caching needed - database is fast)
async function fetchPricingData(): Promise<PricingData> {
  const response = await fetch('/api/pricing/data');
  if (!response.ok) {
    throw new Error('Failed to fetch pricing data');
  }
  return await response.json();
}

// Get pricing data
async function getPricingData(): Promise<PricingData> {
  return await fetchPricingData();
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