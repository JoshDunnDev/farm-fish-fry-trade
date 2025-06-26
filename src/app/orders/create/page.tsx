"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
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

const ITEM_TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function CreateOrderPage() {
  const { data: session, status } = useSession();
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div>Loading...</div>;
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

    const pricePerUnit = parseFloat(formData.pricePerUnit);
    const amount = parseInt(formData.amount);

    if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
      setError("Price per unit must be a positive number");
      setIsLoading(false);
      return;
    }

    if (isNaN(amount) || amount <= 0) {
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
          pricePerUnit,
          amount,
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Order</h1>
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
                onValueChange={(value) => handleInputChange("orderType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select order type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Buy Order - I want to buy</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="SELL">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Sell Order - I have to sell</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getOrderTypeDescription()}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                type="text"
                placeholder="e.g., Fish, Bulbs, Salt, etc."
                value={formData.itemName}
                onChange={(e) => handleInputChange("itemName", e.target.value)}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Select
                value={formData.tier.toString()}
                onValueChange={(value) =>
                  handleInputChange("tier", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TIERS.map((tier) => (
                    <SelectItem key={tier} value={tier.toString()}>
                      Tier {tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  onChange={(e) =>
                    handleInputChange("pricePerUnit", e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="bg-secondary/20 p-4 rounded-md">
              <p className="text-sm text-muted-foreground mb-2">
                Order Summary:
              </p>
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2">
                  <span className="font-medium">Type:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        formData.orderType === "BUY"
                          ? "bg-blue-500"
                          : "bg-green-500"
                      }`}
                    ></div>
                    <span className={getOrderTypeColor()}>
                      {formData.orderType} Order
                    </span>
                  </div>
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
                  {formData.pricePerUnit
                    ? `${formData.pricePerUnit} Hex Coin`
                    : "0.00 Hex Coin"}
                </p>
                <p className="font-medium border-t pt-2">
                  <span>Total Value:</span>{" "}
                  {Math.ceil(
                    (parseFloat(formData.pricePerUnit) || 0) *
                      (parseInt(formData.amount) || 0)
                  )}{" "}
                  Hex Coin
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
                {isLoading
                  ? "Creating..."
                  : `Create ${formData.orderType} Order`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
