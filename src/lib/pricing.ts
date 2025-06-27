import pricingData from '@/data/pricing.json';

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

// Load pricing data
export const pricing: PricingData = pricingData;

// Get price for a specific item and tier
export function getItemPrice(itemName: string, tier: number): number | null {
  const item = pricing.items[itemName];
  if (!item) return null;
  
  const tierKey = `tier${tier}`;
  return item[tierKey] || null;
}

// Get all items with their prices
export function getAllItems(): Array<{name: string, prices: {[tier: string]: number}}> {
  return Object.entries(pricing.items).map(([name, prices]) => ({
    name,
    prices
  }));
}

// Get all available items (just names)
export function getItemNames(): string[] {
  return Object.keys(pricing.items).sort();
}

// Get all available tiers for a specific item
export function getAvailableTiersForItem(itemName: string): number[] {
  const item = pricing.items[itemName];
  if (!item) return [];
  
  return Object.keys(item)
    .map(key => parseInt(key.replace('tier', '')))
    .sort((a, b) => a - b);
}

// Get all tiers that have any pricing data
export function getAvailableTiers(): number[] {
  const allTiers = new Set<number>();
  
  Object.values(pricing.items).forEach(item => {
    Object.keys(item).forEach(tierKey => {
      const tier = parseInt(tierKey.replace('tier', ''));
      allTiers.add(tier);
    });
  });
  
  return Array.from(allTiers).sort((a, b) => a - b);
}

// Search items by name
export function searchItems(query: string): Array<{name: string, prices: {[tier: string]: number}}> {
  const lowercaseQuery = query.toLowerCase();
  
  return getAllItems().filter(item => 
    item.name.toLowerCase().includes(lowercaseQuery)
  );
}

// Get price suggestion for order creation
export function getPriceSuggestion(itemName: string, tier: number): {
  suggested: number;
  found: boolean;
} {
  const price = getItemPrice(itemName, tier);
  
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
export function getPricingMetadata() {
  return {
    lastUpdated: pricing.lastUpdated,
    version: pricing.version,
    notes: pricing.notes
  };
}

// Format price with HC suffix
export function formatPrice(price: number): string {
  return price % 1 === 0 ? `${price.toFixed(0)} HC` : `${price.toFixed(3).replace(/\.?0+$/, '')} HC`;
} 