"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrders } from "@/hooks/useOrders";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

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
  discordId: string;
  discordName: string;
  inGameName: string | null;
}

interface OrdersResponse {
  orders: Order[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
  currentUser?: User;
}

export default function OrdersPage() {
  const router = useRouter();

  // Use the optimized orders hook (includes session management)
  const {
    orders: allOrders,
    loading,
    currentUser,
    hasMore,
    totalCount,
    session,
    status,
    loadMore,
    updateOrder,
    removeOrder,
    refreshSession,
  } = useOrders();

  const [activeTab, setActiveTab] = useState<"all" | "my">("all");
  const [filters, setFilters] = useState({
    orderType: "ALL",
    status: "ALL",
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    orderId: string | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    orderId: null,
    isLoading: false,
  });

  // Memoized filtered orders
  const { filteredOrders, myOrders, allOrdersForDisplay, myOrdersForDisplay } =
    useMemo(() => {
      const myOrdersList = currentUser
        ? allOrders.filter(
            (order) =>
              order.creator.id === currentUser.id ||
              order.claimer?.id === currentUser.id
          )
        : [];

      // For tab counts, exclude fulfilled orders from "All" tab
      const allOrdersForDisplay = allOrders.filter(
        (order) => order.status !== "FULFILLED"
      );
      const myOrdersForDisplay = myOrdersList; // "Mine" tab shows all orders including fulfilled

      const sourceOrders = activeTab === "all" ? allOrders : myOrdersList;

      const filtered = sourceOrders.filter((order) => {
        // On "All" tab, exclude fulfilled orders
        if (activeTab === "all" && order.status === "FULFILLED") {
          return false;
        }

        // Apply status and order type filters
        if (
          filters.orderType !== "ALL" &&
          order.orderType !== filters.orderType
        ) {
          return false;
        }
        if (filters.status !== "ALL" && order.status !== filters.status) {
          return false;
        }
        return true;
      });

      return {
        filteredOrders: filtered,
        myOrders: myOrdersList,
        allOrdersForDisplay,
        myOrdersForDisplay,
      };
    }, [allOrders, currentUser, activeTab, filters]);

  // Memoized order counts
  const counts = useMemo(() => {
    const countsSource =
      activeTab === "all"
        ? allOrders.filter((order) => order.status !== "FULFILLED")
        : myOrders;

    return {
      open: countsSource.filter((order) => order.status === "OPEN").length,
      inProgress: countsSource.filter((order) => order.status === "IN_PROGRESS")
        .length,
      readyToTrade: countsSource.filter(
        (order) => order.status === "READY_TO_TRADE"
      ).length,
      fulfilled: countsSource.filter((order) => order.status === "FULFILLED")
        .length,
      buy: countsSource.filter((order) => order.orderType === "BUY").length,
      sell: countsSource.filter((order) => order.orderType === "SELL").length,
    };
  }, [allOrders, myOrders, activeTab]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
    }
  }, [session, status, router]);

  const handleClaimOrder = async (orderId: string) => {
    // Optimistic update - immediately update the UI
    updateOrder(orderId, { status: "IN_PROGRESS", claimer: currentUser });

    try {
      const response = await fetch(`/api/orders/${orderId}/claim`, {
        method: "POST",
      });

      if (!response.ok) {
        // Revert the optimistic update on error
        updateOrder(orderId, { status: "OPEN", claimer: null });
        const error = await response.json();
        alert(error.error || "Failed to claim order");
      }
    } catch (error) {
      // Revert the optimistic update on error
      updateOrder(orderId, { status: "OPEN", claimer: null });
      console.error("Error claiming order:", error);
      alert("Failed to claim order");
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    // Optimistic update - immediately update the UI
    updateOrder(orderId, {
      status: "FULFILLED",
      fulfilledAt: new Date().toISOString(),
    });

    try {
      const response = await fetch(`/api/orders/${orderId}/complete`, {
        method: "POST",
      });

      if (!response.ok) {
        // Revert the optimistic update on error
        updateOrder(orderId, {
          status: "READY_TO_TRADE",
          fulfilledAt: undefined,
        });
        const error = await response.json();
        alert(error.error || "Failed to complete order");
      }
    } catch (error) {
      // Revert the optimistic update on error
      updateOrder(orderId, {
        status: "READY_TO_TRADE",
        fulfilledAt: undefined,
      });
      console.error("Error completing order:", error);
      alert("Failed to complete order");
    }
  };

  const handleMarkReady = async (orderId: string) => {
    // Optimistic update - immediately update the UI
    updateOrder(orderId, { status: "READY_TO_TRADE" });

    try {
      const response = await fetch(`/api/orders/${orderId}/ready`, {
        method: "POST",
      });

      if (!response.ok) {
        // Revert the optimistic update on error
        updateOrder(orderId, { status: "IN_PROGRESS" });
        const error = await response.json();
        alert(error.error || "Failed to mark order as ready");
      }
    } catch (error) {
      // Revert the optimistic update on error
      updateOrder(orderId, { status: "IN_PROGRESS" });
      console.error("Error marking order as ready:", error);
      alert("Failed to mark order as ready");
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    setDeleteModal({
      isOpen: true,
      orderId,
      isLoading: false,
    });
  };

  const confirmDeleteOrder = async () => {
    if (!deleteModal.orderId) return;

    setDeleteModal((prev) => ({ ...prev, isLoading: true }));

    // Store the order for potential restoration
    const orderToDelete = allOrders.find(
      (order) => order.id === deleteModal.orderId
    );

    // Optimistic update - immediately remove from UI
    removeOrder(deleteModal.orderId);

    try {
      const response = await fetch(`/api/orders?id=${deleteModal.orderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Note: We can't easily restore the order with the current hook structure
        // In a real app, you might want to implement an "undo" mechanism
        const error = await response.json();
        alert(error.error || "Failed to delete order");
        // For now, we'll just refetch the data to restore the order
        window.location.reload();
      } else {
        // Success - close modal
        setDeleteModal({
          isOpen: false,
          orderId: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Failed to delete order");
      // For now, we'll just refetch the data to restore the order
      window.location.reload();
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trade Orders</h1>
            <p className="text-sm text-muted-foreground">Loading orders...</p>
          </div>
          <div className="w-24 h-8 bg-muted animate-pulse rounded"></div>
        </div>

        {/* Loading skeleton for filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-32 h-8 bg-muted animate-pulse rounded"></div>
          <div className="w-24 h-8 bg-muted animate-pulse rounded"></div>
          <div className="w-28 h-8 bg-muted animate-pulse rounded"></div>
        </div>

        {/* Loading skeleton for stats */}
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-16 h-6 bg-muted animate-pulse rounded"
            ></div>
          ))}
        </div>

        {/* Loading skeleton for table */}
        <Card>
          <CardContent className="p-0">
            <div className="p-6 text-center text-muted-foreground">
              Loading orders...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatPrice = (price: number) => {
    // Remove unnecessary trailing zeros and add HC suffix
    return price % 1 === 0
      ? `${price.toFixed(0)} HC`
      : `${price.toFixed(3).replace(/\.?0+$/, "")} HC`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Open
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            In Progress
          </span>
        );
      case "READY_TO_TRADE":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Ready to Trade
          </span>
        );
      case "FULFILLED":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Fulfilled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getOrderTypeBadge = (orderType: string) => {
    if (orderType === "BUY") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          Buy
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Sell
        </span>
      );
    }
  };

  const canClaimOrder = (order: Order) => {
    return (
      order.status === "OPEN" &&
      currentUser &&
      order.creator.id !== currentUser.id
    );
  };

  const canCompleteOrder = (order: Order) => {
    // For buy orders, they must be READY_TO_TRADE first (not IN_PROGRESS)
    if (order.orderType === "BUY" && order.status === "IN_PROGRESS") {
      return false;
    }

    return (
      (order.status === "IN_PROGRESS" || order.status === "READY_TO_TRADE") &&
      currentUser &&
      (order.creator.id === currentUser.id ||
        order.claimer?.id === currentUser.id)
    );
  };

  const canMarkReady = (order: Order) => {
    return (
      order.status === "IN_PROGRESS" &&
      order.orderType === "BUY" && // Only buy orders need manual "mark ready"
      currentUser &&
      order.claimer?.id === currentUser.id
    );
  };

  const canDeleteOrder = (order: Order) => {
    return (
      order.status === "OPEN" &&
      currentUser &&
      order.creator.id === currentUser.id
    );
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trade Orders</h1>
          <p className="text-sm text-muted-foreground">
            View and manage trade orders
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/orders/create">Create Order</Link>
        </Button>
      </div>

      {/* Tab Navigation & Filters - Condensed */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({allOrdersForDisplay.length})
          </button>
          <button
            onClick={() => setActiveTab("my")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === "my"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mine ({myOrdersForDisplay.length})
          </button>
        </div>

        <Select
          value={filters.orderType}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, orderType: value }))
          }
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="BUY">Buy</SelectItem>
            <SelectItem value="SELL">Sell</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger className="w-36 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="READY_TO_TRADE">Ready</SelectItem>
            <SelectItem value="FULFILLED">Fulfilled</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">
          {filteredOrders.length} orders
        </div>
      </div>

      {/* Compact Stats */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded">
          Open: {counts.open}
        </span>
        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded">
          In Progress: {counts.inProgress}
        </span>
        <span className="px-2 py-1 bg-primary/20 text-primary border border-primary/30 rounded">
          Ready: {counts.readyToTrade}
        </span>
        <span className="px-2 py-1 bg-muted text-muted-foreground border border-border rounded">
          Fulfilled: {counts.fulfilled}
        </span>
        <span className="px-2 py-1 bg-secondary text-secondary-foreground border border-border rounded">
          Buy: {counts.buy} | Sell: {counts.sell}
        </span>
      </div>

      {/* Compact Orders Table */}
      <Card>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-muted-foreground">No orders found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTab === "all"
                  ? "Try adjusting filters or create the first order!"
                  : "You haven't created or claimed any orders yet."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col className="w-48" />
                    <col className="w-20" />
                    <col className="w-24" />
                    <col className="w-24" />
                    <col className="w-28" />
                    <col className="w-28" />
                    <col className="w-32" />
                    <col className="w-32" />
                    <col className="w-28" />
                  </colgroup>
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">
                        Item & Date
                      </th>
                      <th className="text-left px-2 py-2 font-medium">Type</th>
                      <th className="text-left px-2 py-2 font-medium">
                        Status
                      </th>
                      <th className="text-left px-2 py-2 font-medium">
                        Amount
                      </th>
                      <th className="text-left px-2 py-2 font-medium">
                        Price/Unit
                      </th>
                      <th className="text-left px-2 py-2 font-medium">Total</th>
                      <th className="text-left px-2 py-2 font-medium">
                        Creator
                      </th>
                      <th className="text-left px-2 py-2 font-medium">
                        Claimer
                      </th>
                      <th className="text-left px-3 py-2 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order, index) => (
                      <tr
                        key={order.id}
                        className={`border-b hover:bg-muted/30 ${
                          index % 2 === 0 ? "bg-background" : "bg-muted/10"
                        }`}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium truncate">
                            T{order.tier}{" "}
                            {order.itemName.charAt(0).toUpperCase() +
                              order.itemName.slice(1).toLowerCase()}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {formatDateTime(order.createdAt)}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-left">
                          {order.orderType === "BUY" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                              Buy
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              Sell
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-left">
                          {order.status === "OPEN" && (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                              Open
                            </span>
                          )}
                          {order.status === "IN_PROGRESS" && (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              In Progress
                            </span>
                          )}
                          {order.status === "READY_TO_TRADE" && (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                              Ready
                            </span>
                          )}
                          {order.status === "FULFILLED" && (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
                              Fulfilled
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-left font-mono">
                          {order.amount.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-left font-mono">
                          {formatPrice(order.pricePerUnit)}
                        </td>
                        <td className="px-2 py-2 text-left font-mono font-medium">
                          {formatPrice(
                            Math.ceil(order.amount * order.pricePerUnit)
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <div className="text-sm truncate">
                            {order.creator.inGameName ||
                              order.creator.discordName}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="text-sm truncate">
                            {order.claimer
                              ? order.claimer.inGameName ||
                                order.claimer.discordName
                              : "-"}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-start">
                            {canClaimOrder(order) && (
                              <Button
                                size="sm"
                                onClick={() => handleClaimOrder(order.id)}
                                className="h-6 w-20 text-xs px-2 py-1 bg-primary/80 hover:bg-primary text-primary-foreground"
                              >
                                Claim
                              </Button>
                            )}
                            {canMarkReady(order) && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkReady(order.id)}
                                className="h-6 w-20 text-xs px-2 py-1 bg-yellow-500/80 hover:bg-yellow-500 text-black"
                              >
                                Ready
                              </Button>
                            )}
                            {canCompleteOrder(order) && (
                              <Button
                                size="sm"
                                onClick={() => handleCompleteOrder(order.id)}
                                className="h-6 w-20 text-xs px-2 py-1 bg-green-500/80 hover:bg-green-500 text-black"
                              >
                                Complete
                              </Button>
                            )}
                            {canDeleteOrder(order) && (
                              <Button
                                size="sm"
                                onClick={() => handleDeleteOrder(order.id)}
                                className="h-6 w-20 text-xs px-2 py-1 bg-destructive/80 hover:bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Load More Button */}
              {hasMore && activeTab === "all" && (
                <div className="flex justify-center py-4 border-t">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                    className="min-w-32"
                  >
                    {loading
                      ? "Loading..."
                      : `Load More (${
                          totalCount - allOrders.length
                        } remaining)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({ isOpen: false, orderId: null, isLoading: false })
        }
        onConfirm={confirmDeleteOrder}
        title="Delete Order"
        description="Are you sure you want to delete this order? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteModal.isLoading}
        variant="destructive"
      />
    </div>
  );
}
