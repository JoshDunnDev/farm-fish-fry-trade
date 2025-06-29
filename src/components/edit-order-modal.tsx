"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Order {
  id: string;
  itemName: string;
  tier: number;
  pricePerUnit: number;
  amount: number;
  orderType: string;
  status: string;
  createdAt: string;
  fulfilledAt?: string;
  creator: {
    id: string;
    discordName: string;
    inGameName: string | null;
  };
  claimer?: {
    id: string;
    discordName: string;
    inGameName: string | null;
  } | null;
}

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (editedOrder: Partial<Order>) => void;
  order: Order | null;
  isLoading: boolean;
}

export function EditOrderModal({
  isOpen,
  onClose,
  onConfirm,
  order,
  isLoading,
}: EditOrderModalProps) {
  const [formData, setFormData] = useState({
    tier: 1,
    pricePerUnit: 0,
    amount: 1,
    orderType: "BUY",
  });

  // Reset form when order changes
  useEffect(() => {
    if (order) {
      setFormData({
        tier: order.tier,
        pricePerUnit: order.pricePerUnit,
        amount: order.amount,
        orderType: order.orderType,
      });
    }
  }, [order]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (formData.tier < 1 || formData.tier > 10) {
      alert("Tier must be between 1 and 10");
      return;
    }

    if (formData.pricePerUnit <= 0) {
      alert("Price must be greater than 0");
      return;
    }

    if (formData.amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    onConfirm(formData);
  };

  const formatPrice = (price: number) => {
    return price % 1 === 0
      ? `${price.toFixed(0)} HC`
      : `${price.toFixed(3).replace(/\.?0+$/, "")} HC`;
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
          <DialogDescription>
            Make changes to your order. You can edit orders until they are
            completed. Changing order type will automatically update the status
            if needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Item:</span>{" "}
              {order.itemName.charAt(0).toUpperCase() + order.itemName.slice(1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Item name cannot be changed. Delete and recreate the order if you
              need a different item.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Select
                value={formData.tier.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, tier: parseInt(value) })
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tier) => (
                    <SelectItem key={tier} value={tier.toString()}>
                      T{tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderType">Order Type</Label>
              <Select
                value={formData.orderType}
                onValueChange={(value) =>
                  setFormData({ ...formData, orderType: value })
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">Buy</SelectItem>
                  <SelectItem value="SELL">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseInt(e.target.value) || 1,
                  })
                }
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerUnit">Price per Unit (HC)</Label>
              <Input
                id="pricePerUnit"
                type="number"
                min="0.001"
                step="0.001"
                value={formData.pricePerUnit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pricePerUnit: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Total Value:</span>
                <span className="font-mono font-medium">
                  {formatPrice(
                    Math.ceil(formData.amount * formData.pricePerUnit)
                  )}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formData.amount.toLocaleString()} ×{" "}
                {formatPrice(formData.pricePerUnit)}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
