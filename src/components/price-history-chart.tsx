"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatPrice } from "@/lib/pricing";

interface PriceHistoryEntry {
  price: number;
  previousPrice: number | null;
  changeType: string;
  date: string;
}

interface PriceHistoryData {
  itemName: string;
  tier: number;
  days: number;
  currentPrice: number | null;
  history: PriceHistoryEntry[];
  totalEntries: number;
}

interface PriceHistoryChartProps {
  itemName: string;
  tier: number;
  onClose?: () => void;
}

const chartConfig = {
  price: {
    label: "Price",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function PriceHistoryChart({
  itemName,
  tier,
  onClose,
}: PriceHistoryChartProps) {
  const [data, setData] = useState<PriceHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(30);

  const dayOptions = [7, 14, 30, 60, 90];

  useEffect(() => {
    async function fetchPriceHistory() {
      try {
        // Only show loading state on initial load
        if (data === null) {
          setLoading(true);
        }
        setError(null);

        const response = await fetch(
          `/api/pricing/history?itemName=${encodeURIComponent(
            itemName
          )}&tier=${tier}&days=${selectedDays}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch price history");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        // Only clear loading on initial load
        if (data === null) {
          setLoading(false);
        }
      }
    }

    fetchPriceHistory();
  }, [itemName, tier, selectedDays]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Price History - T{tier}{" "}
              {itemName.charAt(0).toUpperCase() + itemName.slice(1)}
            </span>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p>Loading price history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Price History - T{tier}{" "}
              {itemName.charAt(0).toUpperCase() + itemName.slice(1)}
            </span>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-red-500">
            <p>Error loading price history: {error || "No data available"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.history.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Price History - T{tier}{" "}
              {itemName.charAt(0).toUpperCase() + itemName.slice(1)}
            </span>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>No price history available for this item and tier</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for the chart
  const chartData = data.history.map((entry, index) => ({
    date: new Date(entry.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    price: entry.price,
    changeType: entry.changeType,
    index,
  }));

  // Calculate price change
  const firstPrice = data.history[0]?.price;
  const lastPrice =
    data.history[data.history.length - 1]?.price || data.currentPrice;
  const priceChange = lastPrice && firstPrice ? lastPrice - firstPrice : 0;
  const priceChangePercent = firstPrice ? (priceChange / firstPrice) * 100 : 0;

  // Calculate Y-axis domain for better visibility of small changes
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  
  // If the price range is very small, add padding to make changes more visible
  // Use at least 10% padding, or more if the range is very small
  const paddingPercent = Math.max(0.1, priceRange < 0.1 ? 0.3 : 0.15);
  const padding = Math.max(priceRange * paddingPercent, 0.01); // Minimum padding of 0.01
  
  const yAxisDomain = [
    Math.max(0, minPrice - padding), // Don't go below 0
    maxPrice + padding
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              T{tier} {itemName.charAt(0).toUpperCase() + itemName.slice(1)} -
              Price History
            </CardTitle>
            <CardDescription>
              Showing price changes over the last {selectedDays} days
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>

        {/* Time period selector */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-sm text-muted-foreground">Period:</span>
          {dayOptions.map((days) => (
            <Button
              key={days}
              variant={selectedDays === days ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDays(days)}
            >
              {days}d
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 0,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid
              vertical={false}
              horizontal={true}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.15}
              strokeDasharray="2 2"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 6)}
            />
            <YAxis
              width={80}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatPrice(value)}
              domain={yAxisDomain}
              tickCount={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                indicator="dot" 
                hideLabel 
                formatter={(value, name) => [formatPrice(value as number), "Price"]}
              />}
              animationDuration={0}
              isAnimationActive={false}
            />
            <Area
              dataKey="price"
              type="linear"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.15}
              stroke="hsl(var(--chart-1))"
              strokeOpacity={0.8}
              strokeWidth={2}
              dot={{
                fill: "hsl(var(--chart-1))",
                strokeWidth: 0,
                r: 5,
                fillOpacity: 1,
              }}
              activeDot={{
                r: 7,
                strokeWidth: 0,
                fill: "hsl(var(--chart-1))",
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>

      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              {priceChange > 0 ? (
                <>
                  Trending up by {priceChangePercent.toFixed(1)}% this period{" "}
                  <TrendingUp className="h-4 w-4" />
                </>
              ) : priceChange < 0 ? (
                <>
                  Trending down by {Math.abs(priceChangePercent).toFixed(1)}%
                  this period <TrendingDown className="h-4 w-4" />
                </>
              ) : (
                "No price change this period"
              )}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              Current price:{" "}
              {data.currentPrice ? formatPrice(data.currentPrice) : "N/A"} •{" "}
              {data.totalEntries} price{" "}
              {data.totalEntries === 1 ? "entry" : "entries"}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
