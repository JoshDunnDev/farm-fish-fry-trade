"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/pricing";

interface PricingData {
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

export default function PricingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch pricing data on component mount
  useEffect(() => {
    async function fetchPricingData() {
      try {
        setLoading(true);
        const response = await fetch('/api/pricing/data');
        if (!response.ok) {
          throw new Error('Failed to fetch pricing data');
        }
        const data = await response.json();
        setPricingData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching pricing data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchPricingData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Loading pricing data...</p>
        </div>
      </div>
    );
  }

  if (error || !pricingData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">
          <p>Error loading pricing data: {error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  // Convert pricing data to the format expected by the UI
  const allItems = Object.entries(pricingData.items).map(([name, prices]) => ({
    name,
    prices
  }));

  // Get available tiers
  const allTiers = new Set<number>();
  Object.values(pricingData.items).forEach(item => {
    Object.keys(item).forEach(tierKey => {
      const tier = parseInt(tierKey.replace('tier', ''));
      allTiers.add(tier);
    });
  });
  const availableTiers = Array.from(allTiers).sort((a, b) => a - b);
  
  // Filter items based on search and tier selection
  const filteredItems = allItems.filter(item => {
    const matchesSearch = searchQuery === "" || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === "all" || Object.keys(item.prices).includes(`tier${selectedTier}`);
    return matchesSearch && matchesTier;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Item Pricing Guide</h1>
        <p className="text-muted-foreground">
          Current market prices for BitCraft items across different tiers
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Last updated: {pricingData.lastUpdated}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={selectedTier} onValueChange={setSelectedTier}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {availableTiers.map((tier) => (
                <SelectItem key={tier} value={tier.toString()}>
                  Tier {tier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Item Prices ({filteredItems.length} items)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Item</th>
                  {availableTiers.map(tier => (
                    <th key={tier} className="text-left py-3 px-4 font-medium">Tier {tier}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={availableTiers.length + 1} className="text-center py-8 text-muted-foreground">
                      No items found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <tr key={item.name} className={`border-b ${index % 2 === 0 ? 'bg-muted/20' : ''} hover:bg-muted/30`}>
                      <td className="py-3 px-4 font-medium capitalize">
                        {item.name}
                      </td>
                      {availableTiers.map(tier => {
                        const tierKey = `tier${tier}`;
                        const price = item.prices[tierKey];
                        return (
                          <td key={tier} className="py-3 px-4">
                            {price !== undefined ? (
                              <span className="font-mono text-sm">
                                {formatPrice(price)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="mt-6 space-y-2">
        {Object.entries(pricingData.notes).map(([key, note]) => (
          <p key={key} className="text-sm text-muted-foreground">
            <strong className="capitalize">{key}:</strong> {note}
          </p>
        ))}
      </div>
    </div>
  );
} 