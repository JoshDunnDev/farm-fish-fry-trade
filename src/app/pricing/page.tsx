"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/pricing";
import { PriceHistoryChart } from "@/components/price-history-chart";

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
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChart, setSelectedChart] = useState<{
    itemName: string;
    tier: number;
  } | null>(null);

  // Fetch pricing data on component mount
  useEffect(() => {
    async function fetchPricingData() {
      try {
        setLoading(true);
        const response = await fetch("/api/pricing/data");
        if (!response.ok) {
          throw new Error("Failed to fetch pricing data");
        }
        const data = await response.json();
        setPricingData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching pricing data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
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
          <p>Error loading pricing data: {error || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  // Convert pricing data to the format expected by the UI
  const allItems = Object.entries(pricingData.items).map(([name, prices]) => ({
    name,
    prices,
  }));

  // Get available tiers
  const allTiers = new Set<number>();
  Object.values(pricingData.items).forEach((item) => {
    Object.keys(item).forEach((tierKey) => {
      const tier = parseInt(tierKey.replace("tier", ""));
      allTiers.add(tier);
    });
  });
  const availableTiers = Array.from(allTiers).sort((a, b) => a - b);

  // Filter items based on search only
  const filteredItems = allItems.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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

      {/* Search Filter */}
      <div className="mb-6">
        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
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
                  {availableTiers.map((tier) => (
                    <th
                      key={tier}
                      className="text-left py-3 px-4 font-medium min-w-[120px]"
                    >
                      Tier {tier}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={availableTiers.length + 1}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No items found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <tr
                      key={item.name}
                      className={`border-b ${
                        index % 2 === 0 ? "bg-muted/20" : ""
                      } hover:bg-muted/30`}
                    >
                      <td className="py-3 px-4 font-medium capitalize">
                        {item.name}
                      </td>
                      {availableTiers.map((tier) => {
                        const tierKey = `tier${tier}`;
                        const price = item.prices[tierKey];
                        return (
                          <td key={tier} className="py-3 px-4 min-w-[120px]">
                            {price !== undefined ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-xs hover:bg-muted/50"
                                  onClick={() =>
                                    setSelectedChart({
                                      itemName: item.name,
                                      tier,
                                    })
                                  }
                                  title={`View price history for T${tier} ${
                                    item.name.charAt(0).toUpperCase() +
                                    item.name.slice(1)
                                  }`}
                                >
                                  📈
                                </Button>
                                <span className="font-mono text-sm whitespace-nowrap">
                                  {formatPrice(price)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                —
                              </span>
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

      {/* Price History Chart */}
      {selectedChart && (
        <div className="mt-6">
          <PriceHistoryChart
            itemName={selectedChart.itemName}
            tier={selectedChart.tier}
            onClose={() => setSelectedChart(null)}
          />
        </div>
      )}

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
