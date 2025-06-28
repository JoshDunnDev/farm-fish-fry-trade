"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: { itemName: string; tier: number; price: number }) => void;
  isLoading?: boolean;
}

export function AddItemModal({
  isOpen,
  onClose,
  onAdd,
  isLoading = false,
}: AddItemModalProps) {
  const [itemName, setItemName] = useState("");
  const [tier, setTier] = useState<number>(1);
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setErrors({});

    // Validation
    const newErrors: { [key: string]: string } = {};

    if (!itemName.trim()) {
      newErrors.itemName = "Item name is required";
    }

    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      newErrors.price = "Valid price is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit the form
    onAdd({
      itemName: itemName.trim(),
      tier,
      price: Number(price),
    });

    // Reset form
    setItemName("");
    setTier(1);
    setPrice("");
    setErrors({});
  };

  const handleClose = () => {
    setItemName("");
    setTier(1);
    setPrice("");
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Add a new item to the pricing database.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="itemName">Item Name</Label>
            <Input
              id="itemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Enter item name"
              disabled={isLoading}
            />
            {errors.itemName && (
              <p className="text-sm text-destructive">{errors.itemName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tier">Tier</Label>
            <Select
              value={tier.toString()}
              onValueChange={(value) => setTier(Number(value))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((t) => (
                  <SelectItem key={t} value={t.toString()}>
                    Tier {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
              disabled={isLoading}
            />
            {errors.price && (
              <p className="text-sm text-destructive">{errors.price}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
