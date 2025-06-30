"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePricing } from "@/hooks/usePricing";
import { useSessionContext } from "@/contexts/SessionContext";
import { PricingData } from "@/lib/pricing";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { AddItemModal } from "@/components/ui/add-item-modal";

interface EditableItem {
  name: string;
  prices: { [tierKey: string]: number | null };
  isNew?: boolean;
}

export default function AdminPricingPage() {
  const router = useRouter();

  // Use optimized hooks
  const { pricingData, loading: pricingLoading, clearCache } = usePricing();
  const { isAdmin, adminLoading } = useSessionContext();

  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modal states
  const [addItemModal, setAddItemModal] = useState({
    isOpen: false,
    isLoading: false,
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    itemIndex: number | null;
    itemName: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    itemIndex: null,
    itemName: "",
    isLoading: false,
  });

  const [removeTierModal, setRemoveTierModal] = useState<{
    isOpen: boolean;
    itemIndex: number | null;
    tier: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    itemIndex: null,
    tier: "",
    isLoading: false,
  });

  const [cancelChangesModal, setCancelChangesModal] = useState({
    isOpen: false,
    isLoading: false,
  });

  const ALL_TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Memoized loading state
  const loading = useMemo(
    () => pricingLoading || adminLoading,
    [pricingLoading, adminLoading]
  );

  // Memoized editable data loader
  const loadEditableData = useCallback((data: PricingData) => {
    const items: EditableItem[] = Object.entries(data.items)
      .map(([name, prices]) => ({
        name,
        prices: { ...prices },
        isNew: false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
    setEditableItems(items);
  }, []);

  // Admin auth is now handled by useAdminAuth hook

  // Load editable data when pricing data is available
  useEffect(() => {
    if (pricingData && isAdmin) {
      loadEditableData(pricingData);
    }
  }, [pricingData, isAdmin, loadEditableData]);

  const updateItemPrice = (itemIndex: number, tier: string, value: string) => {
    const newPrice = parseFloat(value);
    if (isNaN(newPrice) && value !== "") return;

    setEditableItems((prev) => {
      const updated = [...prev];
      if (value === "") {
        // Keep the tier but set it to null to indicate empty value
        updated[itemIndex].prices[tier] = null;
      } else {
        updated[itemIndex].prices[tier] = newPrice;
      }
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  const addNewItem = () => {
    setAddItemModal({ isOpen: true, isLoading: false });
  };

  const handleAddItem = (item: {
    itemName: string;
    tier: number;
    price: number;
  }) => {
    setAddItemModal((prev) => ({ ...prev, isLoading: true }));

    // Check if item already exists
    if (
      editableItems.some(
        (existingItem) =>
          existingItem.name.toLowerCase() === item.itemName.toLowerCase()
      )
    ) {
      setMessage("Item already exists");
      setAddItemModal({ isOpen: false, isLoading: false });
      return;
    }

    const newItem: EditableItem = {
      name: item.itemName,
      prices: {
        [`tier${item.tier}`]: item.price,
      },
      isNew: true,
    };

    setEditableItems((prev) => [newItem, ...prev]);
    setHasUnsavedChanges(true);
    setMessage(
      `Added new item: ${item.itemName} (will be added to the main list after saving)`
    );
    setAddItemModal({ isOpen: false, isLoading: false });
  };

  const removeItem = (itemIndex: number) => {
    const item = editableItems[itemIndex];
    setDeleteModal({
      isOpen: true,
      itemIndex,
      itemName: item.name,
      isLoading: false,
    });
  };

  const confirmRemoveItem = () => {
    if (deleteModal.itemIndex === null) return;

    setDeleteModal((prev) => ({ ...prev, isLoading: true }));

    const item = editableItems[deleteModal.itemIndex];
    setEditableItems((prev) =>
      prev.filter((_, index) => index !== deleteModal.itemIndex)
    );
    setHasUnsavedChanges(true);
    setMessage(`Removed item: ${item.name} (remember to save)`);

    setDeleteModal({
      isOpen: false,
      itemIndex: null,
      itemName: "",
      isLoading: false,
    });
  };

  const addTierToItem = (itemIndex: number, tier: number) => {
    const tierKey = `tier${tier}`;
    setEditableItems((prev) => {
      const updated = [...prev];
      updated[itemIndex].prices[tierKey] = 1.0;
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  const removeTierFromItem = (itemIndex: number, tier: string) => {
    setRemoveTierModal({
      isOpen: true,
      itemIndex,
      tier,
      isLoading: false,
    });
  };

  const confirmRemoveTier = () => {
    if (removeTierModal.itemIndex === null) return;

    setRemoveTierModal((prev) => ({ ...prev, isLoading: true }));

    setEditableItems((prev) => {
      const updated = [...prev];
      delete updated[removeTierModal.itemIndex!].prices[removeTierModal.tier];
      return updated;
    });
    setHasUnsavedChanges(true);

    setRemoveTierModal({
      isOpen: false,
      itemIndex: null,
      tier: "",
      isLoading: false,
    });
  };

  const saveAllChanges = async () => {
    if (!pricingData) return;

    setSaving(true);
    try {
      // Convert editableItems back to the API format
      const updatedItems: { [key: string]: { [key: string]: number } } = {};
      editableItems.forEach((item) => {
        // Filter out null values (empty inputs) when saving
        const validPrices: { [key: string]: number } = {};
        Object.entries(item.prices).forEach(([tierKey, price]) => {
          if (price !== null && price !== undefined && !isNaN(price)) {
            validPrices[tierKey] = price;
          }
        });
        updatedItems[item.name] = validPrices;
      });

      const updatedData = {
        ...pricingData,
        items: updatedItems,
        lastUpdated: new Date().toISOString().split("T")[0],
      };

      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        // Clear cache to force refresh of pricing data
        clearCache();
        // Mark all items as no longer new and sort alphabetically
        const sortedItems = editableItems
          .map((item) => ({ ...item, isNew: false }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setEditableItems(sortedItems);
        setHasUnsavedChanges(false);
        setMessage("All changes saved successfully!");
      } else {
        const error = await response.json();
        setMessage(`Error saving: ${error.error}`);
      }
    } catch (error) {
      setMessage("Error saving changes");
    }
    setSaving(false);
  };

  const cancelChanges = () => {
    setCancelChangesModal({ isOpen: true, isLoading: false });
  };

  const confirmCancelChanges = () => {
    setCancelChangesModal((prev) => ({ ...prev, isLoading: true }));

    if (pricingData) {
      loadEditableData(pricingData);
      setHasUnsavedChanges(false);
      setMessage("Changes cancelled");
    }

    setCancelChangesModal({ isOpen: false, isLoading: false });
  };

  const getItemTiers = (item: EditableItem): number[] => {
    return Object.keys(item.prices)
      .map((key) => parseInt(key.replace("tier", "")))
      .sort((a, b) => a - b);
  };

  const getAvailableNewTiers = (item: EditableItem): number[] => {
    const existingTiers = getItemTiers(item);
    return ALL_TIERS.filter((tier) => !existingTiers.includes(tier));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Price Management</h1>
          <p className="text-muted-foreground mt-2">Loading pricing data...</p>
        </div>

        {/* Loading skeleton for save bar */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg animate-pulse">
          <div className="h-4 bg-muted rounded w-48"></div>
        </div>

        {/* Loading skeleton for add button */}
        <div className="mb-6 flex justify-between items-center">
          <div className="w-32 h-10 bg-muted animate-pulse rounded"></div>
          <div className="w-24 h-4 bg-muted animate-pulse rounded"></div>
        </div>

        {/* Loading skeleton for items */}
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="w-32 h-6 bg-muted animate-pulse rounded"></div>
                  <div className="w-24 h-8 bg-muted animate-pulse rounded"></div>
                </div>
                <div className="w-48 h-4 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="space-y-2">
                      <div className="w-16 h-4 bg-muted animate-pulse rounded"></div>
                      <div className="w-20 h-8 bg-muted animate-pulse rounded"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need admin privileges to access this page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/admin")} className="w-full">
              Get Admin Access
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Price Management</h1>
          <p className="text-sm text-muted-foreground">
            Update prices for all items and tiers
            {pricingData && (
              <span className="text-xs"> • Last saved: {pricingData.lastUpdated}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/orders")}
          >
            Order Management
          </Button>
        </div>
      </div>

      {/* Save/Cancel Bar */}
      {hasUnsavedChanges && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-800 font-medium">
                You have unsaved changes
              </span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={cancelChanges}
                disabled={saving}
              >
                Cancel Changes
              </Button>
              <Button onClick={saveAllChanges} disabled={saving}>
                {saving ? "Saving..." : "Save All Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <Card>
          <CardContent className="pt-4">
            <p
              className={`text-sm ${
                message.includes("Error") || message.includes("Invalid")
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {message}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <Button onClick={addNewItem} disabled={saving}>
          Add New Item
        </Button>
        <div className="text-sm text-muted-foreground">
          {editableItems.length} items • Supports tiers 1-10
        </div>
      </div>

      {editableItems.length > 0 && (
        <div className="space-y-6">
          {/* New Items Section */}
          {editableItems.some((item) => item.isNew) && (
            <div>
              <div className="mb-3 flex items-center space-x-2">
                <h2 className="text-lg font-semibold">New Items</h2>
                <span className="text-sm text-muted-foreground">
                  ({editableItems.filter((item) => item.isNew).length} item
                  {editableItems.filter((item) => item.isNew).length !== 1
                    ? "s"
                    : ""}
                  )
                </span>
              </div>
              <div className="grid gap-4 mb-4">
                {editableItems
                  .filter((item) => item.isNew)
                  .map((item, itemIndex) => {
                    const actualIndex = editableItems.findIndex(
                      (i) => i === item
                    );
                    const itemTiers = getItemTiers(item);
                    const availableNewTiers = getAvailableNewTiers(item);

                    return (
                      <Card key={`new-${item.name}-${actualIndex}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between mb-1">
                            <CardTitle className="capitalize text-lg">
                              {item.name}{" "}
                              <span className="text-sm font-normal text-muted-foreground">
                                (New)
                              </span>
                            </CardTitle>
                            <Button
                              size="sm"
                              onClick={() => removeItem(actualIndex)}
                              className="bg-destructive/80 hover:bg-destructive text-destructive-foreground"
                            >
                              Remove Item
                            </Button>
                          </div>
                          <CardDescription className="text-xs">
                            {itemTiers.length} tier
                            {itemTiers.length !== 1 ? "s" : ""}:{" "}
                            {itemTiers.map((t) => `T${t}`).join(", ")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-3">
                            {itemTiers.map((tier) => {
                              const tierKey = `tier${tier}`;
                              const price = item.prices[tierKey];

                              return (
                                <div key={tierKey} className="space-y-1">
                                  <div className="flex items-center space-x-1">
                                    <Label
                                      htmlFor={`${item.name}-${tierKey}`}
                                      className="text-sm font-medium"
                                    >
                                      Tier {tier}
                                    </Label>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        removeTierFromItem(actualIndex, tierKey)
                                      }
                                      className="h-4 w-4 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Input
                                      id={`${item.name}-${tierKey}`}
                                      type="number"
                                      step="0.001"
                                      min="0"
                                      value={price?.toString() || ""}
                                      onChange={(e) =>
                                        updateItemPrice(
                                          actualIndex,
                                          tierKey,
                                          e.target.value
                                        )
                                      }
                                      className="w-24 text-sm h-8"
                                      placeholder="0.000"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      HC
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {availableNewTiers.length > 0 && (
                            <div className="pt-1 border-t">
                              <Label className="text-xs text-muted-foreground mb-1 block">
                                Add tier:
                              </Label>
                              <div className="flex flex-wrap gap-1">
                                {availableNewTiers.map((tier) => (
                                  <Button
                                    key={tier}
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      addTierToItem(actualIndex, tier)
                                    }
                                    className="h-7 px-2 text-xs"
                                  >
                                    + T{tier}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Divider between sections */}
          {editableItems.some((item) => item.isNew) &&
            editableItems.some((item) => !item.isNew) && (
              <div className="border-t border-border my-6"></div>
            )}

          {/* Existing Items Section */}
          {editableItems.some((item) => !item.isNew) && (
            <div>
              <div className="mb-3 flex items-center space-x-2">
                <h2 className="text-lg font-semibold">Items</h2>
                <span className="text-sm text-muted-foreground">
                  ({editableItems.filter((item) => !item.isNew).length} item
                  {editableItems.filter((item) => !item.isNew).length !== 1
                    ? "s"
                    : ""}
                  )
                </span>
              </div>
              <div className="grid gap-4">
                {editableItems
                  .filter((item) => !item.isNew)
                  .map((item, itemIndex) => {
                    const actualIndex = editableItems.findIndex(
                      (i) => i === item
                    );
                    const itemTiers = getItemTiers(item);
                    const availableNewTiers = getAvailableNewTiers(item);

                    return (
                      <Card key={`existing-${item.name}-${actualIndex}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between mb-1">
                            <CardTitle className="capitalize text-lg">
                              {item.name}
                            </CardTitle>
                            <Button
                              size="sm"
                              onClick={() => removeItem(actualIndex)}
                              className="bg-destructive/80 hover:bg-destructive text-destructive-foreground"
                            >
                              Remove Item
                            </Button>
                          </div>
                          <CardDescription className="text-xs">
                            {itemTiers.length} tier
                            {itemTiers.length !== 1 ? "s" : ""}:{" "}
                            {itemTiers.map((t) => `T${t}`).join(", ")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-3">
                            {itemTiers.map((tier) => {
                              const tierKey = `tier${tier}`;
                              const price = item.prices[tierKey];

                              return (
                                <div key={tierKey} className="space-y-1">
                                  <div className="flex items-center space-x-1">
                                    <Label
                                      htmlFor={`${item.name}-${tierKey}`}
                                      className="text-sm font-medium"
                                    >
                                      Tier {tier}
                                    </Label>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        removeTierFromItem(actualIndex, tierKey)
                                      }
                                      className="h-4 w-4 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Input
                                      id={`${item.name}-${tierKey}`}
                                      type="number"
                                      step="0.001"
                                      min="0"
                                      value={price?.toString() || ""}
                                      onChange={(e) =>
                                        updateItemPrice(
                                          actualIndex,
                                          tierKey,
                                          e.target.value
                                        )
                                      }
                                      className="w-24 text-sm h-8"
                                      placeholder="0.000"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      HC
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {availableNewTiers.length > 0 && (
                            <div className="pt-1 border-t">
                              <Label className="text-xs text-muted-foreground mb-1 block">
                                Add tier:
                              </Label>
                              <div className="flex flex-wrap gap-1">
                                {availableNewTiers.map((tier) => (
                                  <Button
                                    key={tier}
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      addTierToItem(actualIndex, tier)
                                    }
                                    className="h-7 px-2 text-xs"
                                  >
                                    + T{tier}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Button at Bottom */}
      {hasUnsavedChanges && (
        <div className="mt-8 flex justify-center">
          <Button
            onClick={saveAllChanges}
            disabled={saving}
            size="lg"
            className="px-8"
          >
            {saving ? "Saving Changes..." : "Save All Changes"}
          </Button>
        </div>
      )}

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2 text-foreground">How it works:</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>
            • Make changes to prices and click "Save All Changes" to apply them
          </li>
          <li>• Changes are only saved when you click the save button</li>
          <li>
            • You can add/remove tiers for each item (game supports tiers 1-10)
          </li>
          <li>• Users will see new prices immediately after saving</li>
          <li>• Click "Cancel Changes" to revert all unsaved modifications</li>
        </ul>
      </div>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={addItemModal.isOpen}
        onClose={() => setAddItemModal({ isOpen: false, isLoading: false })}
        onAdd={handleAddItem}
        isLoading={addItemModal.isLoading}
      />

      {/* Delete Item Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({
            isOpen: false,
            itemIndex: null,
            itemName: "",
            isLoading: false,
          })
        }
        onConfirm={confirmRemoveItem}
        title="Remove Item"
        description={`Are you sure you want to remove "${deleteModal.itemName}"? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        isLoading={deleteModal.isLoading}
        variant="destructive"
      />

      {/* Remove Tier Confirmation Modal */}
      <ConfirmationModal
        isOpen={removeTierModal.isOpen}
        onClose={() =>
          setRemoveTierModal({
            isOpen: false,
            itemIndex: null,
            tier: "",
            isLoading: false,
          })
        }
        onConfirm={confirmRemoveTier}
        title="Remove Tier"
        description={`Remove ${removeTierModal.tier} from this item?`}
        confirmText="Remove"
        cancelText="Cancel"
        isLoading={removeTierModal.isLoading}
        variant="destructive"
      />

      {/* Cancel Changes Confirmation Modal */}
      <ConfirmationModal
        isOpen={cancelChangesModal.isOpen}
        onClose={() =>
          setCancelChangesModal({ isOpen: false, isLoading: false })
        }
        onConfirm={confirmCancelChanges}
        title="Cancel Changes"
        description="Are you sure you want to cancel all unsaved changes? This action cannot be undone."
        confirmText="Cancel Changes"
        cancelText="Keep Editing"
        isLoading={cancelChangesModal.isLoading}
        variant="destructive"
      />
    </div>
  );
}
