"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSessionContext } from "@/contexts/SessionContext";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { formatPrice } from "@/lib/pricing";

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

export default function AdminOrdersPage() {
  const router = useRouter();
  const { isAdmin, adminLoading, session } = useSessionContext();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [message, setMessage] = useState("");

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    order: Order | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    order: null,
    isLoading: false,
  });

  // Redirect non-admin users
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, adminLoading, router]);

  // Fetch orders
  useEffect(() => {
    if (!isAdmin) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/admin/orders");
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }

        const data = await response.json();
        setOrders(data.orders || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAdmin]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        order.itemName.toLowerCase().includes(searchLower) ||
        order.creator.discordName?.toLowerCase().includes(searchLower) ||
        order.creator.inGameName?.toLowerCase().includes(searchLower) ||
        order.claimer?.discordName?.toLowerCase().includes(searchLower) ||
        order.claimer?.inGameName?.toLowerCase().includes(searchLower) ||
        order.id.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;

      // Type filter
      const matchesType = typeFilter === "ALL" || order.orderType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [orders, searchQuery, statusFilter, typeFilter]);

  const handleDeleteOrder = (order: Order) => {
    setDeleteModal({
      isOpen: true,
      order,
      isLoading: false,
    });
  };

  const confirmDeleteOrder = async () => {
    if (!deleteModal.order) return;

    setDeleteModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/admin/orders/${deleteModal.order.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete order");
      }

      // Remove order from local state
      setOrders((prev) =>
        prev.filter((order) => order.id !== deleteModal.order!.id)
      );

      setMessage(`Order ${deleteModal.order.id} deleted successfully`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(
        `Error deleting order: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setDeleteModal({
        isOpen: false,
        order: null,
        isLoading: false,
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      OPEN: "bg-green-500/20 text-green-400 border-green-500/30",
      IN_PROGRESS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      READY_TO_TRADE: "bg-primary/20 text-primary border-primary/30",
      FULFILLED: "bg-muted text-muted-foreground border-border",
    };
    return badges[status as keyof typeof badges] || badges.OPEN;
  };

  const getTypeBadge = (type: string) => {
    return type === "BUY"
      ? "bg-primary/20 text-primary border-primary/30"
      : "bg-orange-500/20 text-orange-400 border-orange-500/30";
  };

  if (adminLoading || !session) {
    return (
      <div className="container mx-auto px-6 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
          <p className="text-sm text-muted-foreground">
            View and manage all orders in the system
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/pricing")}
          >
            Pricing Management
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search by item, user, or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="SELL">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Message */}
      {message && (
        <Card>
          <CardContent className="pt-4">
            <p
              className={`text-sm ${
                message.includes("Error")
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Orders ({filteredOrders.length} of {orders.length})
          </CardTitle>
          <CardDescription>
            {loading ? "Loading orders..." : "All orders in the system"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 px-4">
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 px-4">
              <p className="text-red-500">Error: {error}</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-muted-foreground/20 bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Order ID</th>
                    <th className="text-left px-4 py-3 font-medium">Item</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 font-medium">Price/Unit</th>
                    <th className="text-left px-4 py-3 font-medium">Total</th>
                    <th className="text-left px-4 py-3 font-medium">Creator</th>
                    <th className="text-left px-4 py-3 font-medium">Claimer</th>
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => (
                    <tr
                      key={order.id}
                      className={`border-b border-muted-foreground/20 hover:bg-muted/30 ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/10"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs">
                          {order.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          T{order.tier}{" "}
                          {order.itemName.charAt(0).toUpperCase() +
                            order.itemName.slice(1).toLowerCase()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getTypeBadge(
                            order.orderType
                          )}`}
                        >
                          {order.orderType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          {order.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {order.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {formatPrice(order.pricePerUnit)}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium">
                        {formatPrice(
                          Math.ceil(order.amount * order.pricePerUnit)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {order.creator.inGameName ||
                            order.creator.discordName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {order.claimer
                            ? order.claimer.inGameName ||
                              order.claimer.discordName
                            : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteOrder(order)}
                          className="h-8 px-3 text-xs"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({ isOpen: false, order: null, isLoading: false })
        }
        onConfirm={confirmDeleteOrder}
        title="Delete Order"
        description={
          deleteModal.order
            ? `Are you sure you want to delete this order? This action cannot be undone.\n\nOrder: T${deleteModal.order.tier} ${deleteModal.order.itemName} (${deleteModal.order.orderType})\nCreated by: ${deleteModal.order.creator.discordName}\nID: ${deleteModal.order.id}`
            : ""
        }
        confirmText="Delete Order"
        cancelText="Cancel"
        isLoading={deleteModal.isLoading}
        variant="destructive"
      />
    </div>
  );
} 