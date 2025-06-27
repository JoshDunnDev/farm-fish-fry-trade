"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSessionContext } from "@/contexts/SessionContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/pricing";
import {
  usePricing,
  useAvailableItems,
  useAvailableTiers,
  useItemPrice,
} from "@/hooks/usePricing";

export default function CreateOrderPage() {
  const { session, status } = useSessionContext();
  const router = useRouter();
  const [formData, setFormData] = useState({
    orderType: "BUY",
    itemName: "",
    tier: 1,
    pricePerUnit: "",
    amount: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Ref to prevent unnecessary price updates
  const lastPriceUpdateRef = useRef<string>("");

  // Use custom pricing hook
  const {
    pricingData,
    loading: pricingLoading,
    error: pricingError,
  } = usePricing();

  // Use pricing utility hooks
  const availableItems = useAvailableItems(pricingData);
  const availableTiers = useAvailableTiers(pricingData, formData.itemName);
  const currentPrice = useItemPrice(
    pricingData,
    formData.itemName,
    formData.tier
  );

  // Memoized order summary calculations
  const orderSummary = useMemo(() => {
    const pricePerUnit = parseFloat(formData.pricePerUnit) || 0;
    const amount = parseInt(formData.amount) || 0;
    const totalValue = Math.ceil(pricePerUnit * amount);

    return {
      pricePerUnit,
      amount,
      totalValue,
      formattedPrice: pricePerUnit
        ? formatPrice(pricePerUnit)
        : "0.00 Hex Coin",
      formattedTotal: totalValue ? `${totalValue} Hex Coin` : "0 Hex Coin",
    };
  }, [formData.pricePerUnit, formData.amount]);

  // Auto-populate price when item or tier changes
  useEffect(() => {
    const newPriceKey = `${formData.itemName}-${formData.tier}-${currentPrice}`;

    // Only update if the price actually changed
    if (lastPriceUpdateRef.current === newPriceKey) {
      return;
    }

    if (currentPrice !== null) {
      const newPrice = currentPrice.toString();
      if (formData.pricePerUnit !== newPrice) {
        setFormData((prev) => ({
          ...prev,
          pricePerUnit: newPrice,
        }));
        lastPriceUpdateRef.current = newPriceKey;
      }
    } else if (
      pricingData &&
      formData.itemName &&
      formData.tier &&
      formData.pricePerUnit !== ""
    ) {
      // Clear price if tier not available for this item
      setFormData((prev) => ({
        ...prev,
        pricePerUnit: "",
      }));
      lastPriceUpdateRef.current = newPriceKey;
    }
  }, [
    currentPrice,
    pricingData,
    formData.itemName,
    formData.tier,
    formData.pricePerUnit,
  ]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status]);

  if (status === "loading" || pricingLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Create New Order
            </h1>
            <p className="text-muted-foreground">Loading order form...</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading pricing data...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validation
    if (!formData.itemName.trim()) {
      setError("Item name is required");
      setIsLoading(false);
      return;
    }

    if (isNaN(orderSummary.pricePerUnit) || orderSummary.pricePerUnit <= 0) {
      setError("Price per unit must be a positive number");
      setIsLoading(false);
      return;
    }

    if (isNaN(orderSummary.amount) || orderSummary.amount <= 0) {
      setError("Amount must be a positive number");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemName: formData.itemName.trim(),
          tier: parseInt(formData.tier.toString()),
          pricePerUnit: orderSummary.pricePerUnit,
          amount: orderSummary.amount,
          orderType: formData.orderType,
        }),
      });

      if (response.ok) {
        router.push("/orders");
      } else {
        const errorText = await response.text();
        setError(errorText || "Failed to create order");
      }
    } catch (error: any) {
      setError("Failed to create order");
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemNameChange = (value: string) => {
    // Reset tier and price when item changes
    setFormData((prev) => ({
      ...prev,
      itemName: value,
      tier: 1,
      pricePerUnit: "",
    }));
  };

  const handleTierChange = (value: number) => {
    // Reset price when tier changes (will be auto-populated by useEffect)
    setFormData((prev) => ({
      ...prev,
      tier: value,
      pricePerUnit: "",
    }));
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getOrderTypeDescription = () => {
    if (formData.orderType === "BUY") {
      return "You want to buy this item from someone else";
    } else {
      return "You have this item available to sell";
    }
  };

  const getOrderTypeColor = () => {
    return formData.orderType === "BUY" ? "text-blue-600" : "text-green-600";
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create New Order
          </h1>
          <p className="text-muted-foreground">
            Post a new {formData.orderType.toLowerCase()} order for other cohort
            members
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>
              Fill in the details for your trade order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderType">Order Type</Label>
                <Select
                  value={formData.orderType}
                  onValueChange={(value) =>
                    handleInputChange("orderType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select order type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">
                      <span>Buy Order - I want to buy</span>
                    </SelectItem>
                    <SelectItem value="SELL">
                      <span>Sell Order - I have to sell</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getOrderTypeDescription()}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemName">Item Name</Label>
                <Select
                  value={formData.itemName}
                  onValueChange={handleItemNameChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableItems.map((itemName) => (
                      <SelectItem key={itemName} value={itemName}>
                        <span className="capitalize">{itemName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose from available items with pricing data
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier">Tier</Label>
                <Select
                  value={formData.tier.toString()}
                  onValueChange={(value) => handleTierChange(parseInt(value))}
                  disabled={!formData.itemName}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        formData.itemName
                          ? "Select a tier"
                          : "Select item first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTiers.map((tier) => (
                      <SelectItem key={tier} value={tier.toString()}>
                        Tier {tier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.itemName && availableTiers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-red-500">
                    No tiers available for this item
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerUnit">Price per Unit</Label>
                  <Input
                    id="pricePerUnit"
                    type="number"
                    step="0.001"
                    min="0.001"
                    placeholder="0.000"
                    value={formData.pricePerUnit}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Price is automatically set based on current market rates
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.amount}
                    onChange={(e) =>
                      handleInputChange("amount", e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="bg-secondary/20 p-4 rounded-md">
                <p className="text-sm text-muted-foreground mb-2">
                  Order Summary:
                </p>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Type:</span>{" "}
                    <span>
                      {formData.orderType.charAt(0).toUpperCase() +
                        formData.orderType.slice(1).toLowerCase()}{" "}
                      order
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Item:</span>{" "}
                    {formData.itemName
                      ? `T${formData.tier} ${formData.itemName}`
                      : "Not specified"}
                  </p>
                  <p>
                    <span className="font-medium">Amount:</span>{" "}
                    {formData.amount || "0"}
                  </p>
                  <p>
                    <span className="font-medium">Price per unit:</span>{" "}
                    {orderSummary.formattedPrice}
                  </p>
                  <p className="font-medium border-t pt-2">
                    <span>Total Value:</span> {orderSummary.formattedTotal}
                  </p>
                </div>
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/orders")}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
