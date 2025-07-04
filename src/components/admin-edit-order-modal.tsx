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
import { usePricing, useItemPrice } from "@/hooks/usePricing";

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

interface User {
  id: string;
  discordName: string;
  inGameName: string | null;
}

interface AdminEditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (editedOrder: Partial<Order>) => void;
  order: Order | null;
  isLoading: boolean;
}

export function AdminEditOrderModal({
  isOpen,
  onClose,
  onConfirm,
  order,
  isLoading,
}: AdminEditOrderModalProps) {
  const [formData, setFormData] = useState({
    itemName: "",
    tier: 1,
    pricePerUnit: 0,
    amount: 1,
    orderType: "BUY",
    status: "OPEN",
    claimerId: "none",
  });

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [availableItems, setAvailableItems] = useState<string[]>([]);
  
  // Track if user has manually edited the price
  const [userEditedPrice, setUserEditedPrice] = useState(false);
  // Track if the form has been initialized (to prevent auto-population on initial load)
  const [formInitialized, setFormInitialized] = useState(false);
  // Track if user has changed the tier or item (to allow auto-population only after changes)
  const [fieldsChanged, setFieldsChanged] = useState(false);

  // Use pricing hook to get available items
  const { pricingData, loading: pricingLoading } = usePricing();
  
  // Get current price for the selected item and tier
  const currentPrice = useItemPrice(pricingData, formData.itemName, formData.tier);

  // Load available items from pricing data
  useEffect(() => {
    if (pricingData) {
      const items = Object.keys(pricingData.items).sort();
      setAvailableItems(items);
    }
  }, [pricingData]);

  // Load users for claimer dropdown
  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          setLoadingUsers(true);
          const response = await fetch("/api/admin/users");
          if (response.ok) {
            const data = await response.json();
            setUsers(data.users || []);
          }
        } catch (error) {
          console.error("Error fetching users:", error);
        } finally {
          setLoadingUsers(false);
        }
      };

      fetchUsers();
    }
  }, [isOpen]);

  // Reset form when order changes
  useEffect(() => {
    if (order) {
      setFormData({
        itemName: order.itemName,
        tier: order.tier,
        pricePerUnit: order.pricePerUnit,
        amount: order.amount,
        orderType: order.orderType,
        status: order.status,
        claimerId: order.claimer?.id || "none",
      });
      // Reset tracking flags when order changes
      setUserEditedPrice(false);
      setFieldsChanged(false);
      setFormInitialized(true);
    }
  }, [order]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUserEditedPrice(false);
      setFieldsChanged(false);
      setFormInitialized(false);
    }
  }, [isOpen]);

  // Auto-update price when item or tier changes (but only after user changes)
  useEffect(() => {
    if (!order || !formInitialized) return;

    // Only auto-populate if:
    // 1. User hasn't manually edited the price
    // 2. User has changed item/tier (not initial load)
    // 3. We have pricing data for the item/tier
    if (
      !userEditedPrice && 
      fieldsChanged &&
      currentPrice !== null && 
      formData.itemName && 
      formData.tier
    ) {
      setFormData(prev => ({
        ...prev,
        pricePerUnit: currentPrice
      }));
    }
  }, [currentPrice, formData.itemName, formData.tier, userEditedPrice, fieldsChanged, formInitialized, order]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.itemName.trim()) {
      alert("Item name is required");
      return;
    }

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

    // For SELL orders, IN_PROGRESS is not valid
    if (formData.orderType === "SELL" && formData.status === "IN_PROGRESS") {
      alert("IN_PROGRESS status is not valid for SELL orders");
      return;
    }

    const updateData = {
      itemName: formData.itemName.trim().toLowerCase(),
      tier: formData.tier,
      pricePerUnit: formData.pricePerUnit,
      amount: formData.amount,
      orderType: formData.orderType,
      status: formData.status,
      claimerId: formData.claimerId === "none" ? null : formData.claimerId,
    };

    onConfirm(updateData);
  };

  const getAvailableStatuses = () => {
    const allStatuses = ["OPEN", "IN_PROGRESS", "READY_TO_TRADE", "FULFILLED"];
    
    // For SELL orders, exclude IN_PROGRESS
    if (formData.orderType === "SELL") {
      return allStatuses.filter(status => status !== "IN_PROGRESS");
    }
    
    return allStatuses;
  };

  const getAvailableTiers = () => {
    if (!pricingData || !formData.itemName) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    const item = pricingData.items[formData.itemName];
    if (!item) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    return Object.keys(item)
      .map(key => parseInt(key.replace("tier", "")))
      .sort((a, b) => a - b);
  };

  const formatPrice = (price: number) => {
    return price % 1 === 0
      ? `${price.toFixed(0)} HC`
      : `${price.toFixed(3).replace(/\.?0+$/, "")} HC`;
  };

  const handleItemNameChange = (value: string) => {
    setFormData({ ...formData, itemName: value });
    setFieldsChanged(true);
    setUserEditedPrice(false); // Reset price edit flag when item changes
  };

  const handleTierChange = (value: string) => {
    setFormData({ ...formData, tier: parseInt(value) });
    setFieldsChanged(true);
    setUserEditedPrice(false); // Reset price edit flag when tier changes
  };

  const handlePriceChange = (value: string) => {
    setFormData({
      ...formData,
      pricePerUnit: parseFloat(value) || 0,
    });
    setUserEditedPrice(true); // Mark that user has manually edited the price
  };

  const getUserDisplayName = (user: User) => {
    return user.inGameName || user.discordName;
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Order (Admin)</DialogTitle>
          <DialogDescription>
            Edit any aspect of this order. Changes will be applied immediately and notifications will be sent if the status changes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Select
                value={formData.itemName}
                onValueChange={handleItemNameChange}
                disabled={isLoading || pricingLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Select
                value={formData.tier.toString()}
                onValueChange={handleTierChange}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableTiers().map((tier) => (
                    <SelectItem key={tier} value={tier.toString()}>
                      T{tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableStatuses().map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "READY_TO_TRADE" 
                        ? "Ready To Trade"
                        : status === "IN_PROGRESS"
                        ? "In Progress"
                        : status.charAt(0) + status.slice(1).toLowerCase()
                      }
                    </SelectItem>
                  ))}
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
                onChange={(e) => handlePriceChange(e.target.value)}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Auto-filled from pricing page, but you can edit if needed
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="claimer">Claimer</Label>
            <Select
              value={formData.claimerId}
              onValueChange={(value) =>
                setFormData({ ...formData, claimerId: value })
              }
              disabled={isLoading || loadingUsers}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select claimer (optional)" />
              </SelectTrigger>
                             <SelectContent>
                 <SelectItem value="none">No claimer</SelectItem>
                 {users.map((user) => (
                   <SelectItem key={user.id} value={user.id}>
                     {getUserDisplayName(user)}
                   </SelectItem>
                 ))}
               </SelectContent>
            </Select>
            {loadingUsers && (
              <p className="text-xs text-muted-foreground">Loading users...</p>
            )}
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

          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <div className="font-medium mb-1">Current Order Info:</div>
            <div>Created by: {order.creator.inGameName || order.creator.discordName}</div>
            <div>Created: {new Date(order.createdAt).toLocaleString()}</div>
            <div>Order ID: {order.id}</div>
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