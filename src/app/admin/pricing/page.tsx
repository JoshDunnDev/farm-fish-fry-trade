'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

interface EditableItem {
  name: string;
  prices: { [tierKey: string]: number | null };
}

export default function AdminPricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [originalData, setOriginalData] = useState<PricingData | null>(null);
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const ALL_TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Check admin status and load data
  useEffect(() => {
    async function checkAdminAndLoadData() {
      if (status === "loading") return;
      
      if (!session) {
        router.push('/auth/signin');
        return;
      }

      try {
        // Check admin status
        const adminResponse = await fetch('/api/admin/auth');
        const adminData = await adminResponse.json();
        
        if (!adminData.isAdmin) {
          router.push('/admin');
          return;
        }

        setIsAdmin(true);

        // Load pricing data
        const pricingResponse = await fetch('/api/pricing/data');
        if (pricingResponse.ok) {
          const pricingData = await pricingResponse.json();
          setOriginalData(pricingData);
          loadEditableData(pricingData);
        }
      } catch (error) {
        console.error('Error loading admin data:', error);
        setMessage('Error loading data');
      }
      
      setLoading(false);
    }

    checkAdminAndLoadData();
  }, [session, status, router]);

  const loadEditableData = (data: PricingData) => {
    const items: EditableItem[] = Object.entries(data.items).map(([name, prices]) => ({
      name,
      prices: { ...prices },
    }));
    setEditableItems(items);
  };

  const updateItemPrice = (itemIndex: number, tier: string, value: string) => {
    const newPrice = parseFloat(value);
    if (isNaN(newPrice) && value !== '') return;

    setEditableItems(prev => {
      const updated = [...prev];
      if (value === '') {
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
    const itemName = prompt('Enter new item name:');
    if (!itemName) return;

    // Check if item already exists
    if (editableItems.some(item => item.name.toLowerCase() === itemName.toLowerCase())) {
      setMessage('Item already exists');
      return;
    }

    const newItem: EditableItem = {
      name: itemName,
      prices: {
        tier1: 1.0,
        tier2: 1.0,
        tier3: 1.0,
        tier4: 1.0,
      },
    };

    setEditableItems(prev => [newItem, ...prev]);
    setHasUnsavedChanges(true);
    setMessage(`Added new item: ${itemName} (remember to save)`);
  };

  const removeItem = (itemIndex: number) => {
    const item = editableItems[itemIndex];
    if (confirm(`Are you sure you want to remove "${item.name}"?`)) {
      setEditableItems(prev => prev.filter((_, index) => index !== itemIndex));
      setHasUnsavedChanges(true);
      setMessage(`Removed item: ${item.name} (remember to save)`);
    }
  };

  const addTierToItem = (itemIndex: number, tier: number) => {
    const tierKey = `tier${tier}`;
    setEditableItems(prev => {
      const updated = [...prev];
      updated[itemIndex].prices[tierKey] = 1.0;
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  const removeTierFromItem = (itemIndex: number, tier: string) => {
    if (confirm(`Remove ${tier} from this item?`)) {
      setEditableItems(prev => {
        const updated = [...prev];
        delete updated[itemIndex].prices[tier];
        return updated;
      });
      setHasUnsavedChanges(true);
    }
  };

  const saveAllChanges = async () => {
    if (!originalData) return;

    setSaving(true);
    try {
      // Convert editableItems back to the API format
      const updatedItems: { [key: string]: { [key: string]: number } } = {};
      editableItems.forEach(item => {
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
        ...originalData,
        items: updatedItems,
        lastUpdated: new Date().toISOString().split('T')[0],
      };

      const response = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        const result = await response.json();
        setOriginalData(result.data);
        setEditableItems(prev => [...prev]);
        setHasUnsavedChanges(false);
        setMessage('All changes saved successfully!');
      } else {
        const error = await response.json();
        setMessage(`Error saving: ${error.error}`);
      }
    } catch (error) {
      setMessage('Error saving changes');
    }
    setSaving(false);
  };

  const cancelChanges = () => {
    if (confirm('Are you sure you want to cancel all unsaved changes?')) {
      if (originalData) {
        loadEditableData(originalData);
        setHasUnsavedChanges(false);
        setMessage('Changes cancelled');
      }
    }
  };

  const getItemTiers = (item: EditableItem): number[] => {
    return Object.keys(item.prices)
      .map(key => parseInt(key.replace('tier', '')))
      .sort((a, b) => a - b);
  };

  const getAvailableNewTiers = (item: EditableItem): number[] => {
    const existingTiers = getItemTiers(item);
    return ALL_TIERS.filter(tier => !existingTiers.includes(tier));
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
            <CardDescription>You need admin privileges to access this page</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/admin')} className="w-full">
              Get Admin Access
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Price Management</h1>
        <p className="text-muted-foreground mt-2">Update prices for all items and tiers</p>
        {originalData && (
          <p className="text-sm text-muted-foreground mt-1">
            Last saved: {originalData.lastUpdated}
          </p>
        )}
      </div>

      {/* Save/Cancel Bar */}
      {hasUnsavedChanges && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-800 font-medium">You have unsaved changes</span>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={cancelChanges} disabled={saving}>
                Cancel Changes
              </Button>
              <Button onClick={saveAllChanges} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? 'Saving...' : 'Save All Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.includes('Error') || message.includes('Invalid') 
            ? 'bg-red-100 text-red-700' 
            : message.includes('saved successfully') 
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {message}
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <Button onClick={addNewItem} disabled={saving} className="bg-green-600 hover:bg-green-700">
          Add New Item
        </Button>
        <div className="text-sm text-muted-foreground">
          {editableItems.length} items • Supports tiers 1-10
        </div>
      </div>

      {editableItems.length > 0 && (
        <div className="grid gap-6">
          {editableItems.map((item, itemIndex) => {
            const itemTiers = getItemTiers(item);
            const availableNewTiers = getAvailableNewTiers(item);
            
            return (
              <Card key={`${item.name}-${itemIndex}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize">
                      {item.name}
                    </CardTitle>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(itemIndex)}
                    >
                      Remove Item
                    </Button>
                  </div>
                  <CardDescription>
                    {itemTiers.length} tier{itemTiers.length !== 1 ? 's' : ''}: {itemTiers.map(t => `T${t}`).join(', ')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                    {itemTiers.map(tier => {
                      const tierKey = `tier${tier}`;
                      const price = item.prices[tierKey];
                      
                      return (
                        <div key={tierKey} className="space-y-2">
                          <div className="flex items-center space-x-1">
                            <Label htmlFor={`${item.name}-${tierKey}`} className="text-sm font-medium">
                              Tier {tier}
                            </Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTierFromItem(itemIndex, tierKey)}
                              className="h-4 w-4 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              ×
                            </Button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Input
                              id={`${item.name}-${tierKey}`}
                              type="number"
                              step="0.001"
                              min="0"
                              value={price?.toString() || ''}
                              onChange={(e) => updateItemPrice(itemIndex, tierKey, e.target.value)}
                              className="w-20 text-sm"
                              placeholder="0.000"
                            />
                            <span className="text-xs text-muted-foreground">HC</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {availableNewTiers.length > 0 && (
                    <div className="pt-2 border-t">
                      <Label className="text-sm text-muted-foreground mb-2 block">Add tier:</Label>
                      <div className="flex flex-wrap gap-1">
                        {availableNewTiers.map(tier => (
                          <Button
                            key={tier}
                            variant="outline"
                            size="sm"
                            onClick={() => addTierToItem(itemIndex, tier)}
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
      )}

      {/* Save Button at Bottom */}
      {hasUnsavedChanges && (
        <div className="mt-8 flex justify-center">
          <Button onClick={saveAllChanges} disabled={saving} size="lg" className="px-8 bg-green-600 hover:bg-green-700">
            {saving ? 'Saving Changes...' : 'Save All Changes'}
          </Button>
        </div>
      )}

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2 text-foreground">How it works:</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Make changes to prices and click "Save All Changes" to apply them</li>
          <li>• Changes are only saved when you click the save button</li>
          <li>• You can add/remove tiers for each item (game supports tiers 1-10)</li>
          <li>• Users will see new prices immediately after saving</li>
          <li>• Click "Cancel Changes" to revert all unsaved modifications</li>
        </ul>
      </div>
    </div>
  );
} 