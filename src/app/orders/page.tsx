"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");
  const [filters, setFilters] = useState({
    orderType: "ALL",
    status: "ALL",
  });

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchCurrentUser();
    fetchOrders();
  }, [session, status, router]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/user");
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // Fetch all orders
      const allOrdersResponse = await fetch("/api/orders");
      if (allOrdersResponse.ok) {
        const allOrdersData = await allOrdersResponse.json();
        setOrders(allOrdersData);
      }

      // Fetch user's orders if we have session
      if (session?.user?.id) {
        const myOrdersResponse = await fetch(
          `/api/orders?userId=${session.user.id}`
        );
        if (myOrdersResponse.ok) {
          const myOrdersData = await myOrdersResponse.json();
          setMyOrders(myOrdersData);
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/claim`, {
        method: "POST",
      });

      if (response.ok) {
        fetchOrders(); // Refresh orders
      } else {
        const error = await response.json();
        alert(error.error || "Failed to claim order");
      }
    } catch (error) {
      console.error("Error claiming order:", error);
      alert("Failed to claim order");
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/complete`, {
        method: "POST",
      });

      if (response.ok) {
        fetchOrders(); // Refresh orders
      } else {
        const error = await response.json();
        alert(error.error || "Failed to complete order");
      }
    } catch (error) {
      console.error("Error completing order:", error);
      alert("Failed to complete order");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trade Orders</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const filteredOrders = (activeTab === "all" ? orders : myOrders).filter(
    (order) => {
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
    }
  );

  const getOrderCounts = (orderList: Order[]) => {
    return {
      open: orderList.filter((order) => order.status === "OPEN").length,
      inProgress: orderList.filter((order) => order.status === "IN_PROGRESS")
        .length,
      fulfilled: orderList.filter((order) => order.status === "FULFILLED")
        .length,
      buy: orderList.filter((order) => order.orderType === "BUY").length,
      sell: orderList.filter((order) => order.orderType === "SELL").length,
    };
  };

  const counts = getOrderCounts(activeTab === "all" ? orders : myOrders);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
    return (
      order.status === "IN_PROGRESS" &&
      currentUser &&
      (order.creator.id === currentUser.id ||
        order.claimer?.id === currentUser.id)
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade Orders</h1>
          <p className="text-muted-foreground">
            View, create, claim, and fulfill trade orders
          </p>
        </div>
        <Button asChild>
          <Link href="/orders/create">Create Order</Link>
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "all"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "my"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Orders ({myOrders.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Order Type</label>
          <Select
            value={filters.orderType}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, orderType: value }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="BUY">Buy Orders</SelectItem>
              <SelectItem value="SELL">Sell Orders</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="FULFILLED">Fulfilled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts.open}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-700">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts.inProgress}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700">Fulfilled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts.fulfilled}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700">Buy Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts.buy}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700">
              Sell Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts.sell}</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "all" ? "All Orders" : "My Orders"} (
            {filteredOrders.length})
          </CardTitle>
          <CardDescription>
            {activeTab === "all"
              ? "All trade orders from the community"
              : "Orders you've created or claimed"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No orders found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {activeTab === "all"
                  ? "Try adjusting your filters or create the first order!"
                  : "You haven't created or claimed any orders yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          T{order.tier} {order.itemName}
                        </h3>
                        {getOrderTypeBadge(order.orderType)}
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.amount} units @ {order.pricePerUnit.toFixed(3)}{" "}
                        Hex Coin each
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total: {Math.ceil(order.amount * order.pricePerUnit)}{" "}
                        Hex Coin
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {canClaimOrder(order) && (
                        <Button
                          size="sm"
                          onClick={() => handleClaimOrder(order.id)}
                          className="text-xs"
                        >
                          Claim
                        </Button>
                      )}
                      {canCompleteOrder(order) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompleteOrder(order.id)}
                          className="text-xs"
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
                    <p>
                      Created by:{" "}
                      {order.creator.inGameName || order.creator.discordName}
                    </p>
                    {order.claimer && (
                      <p>
                        Claimed by:{" "}
                        {order.claimer.inGameName || order.claimer.discordName}
                      </p>
                    )}
                    <div className="flex justify-between">
                      <span>Created: {formatDate(order.createdAt)}</span>
                      {order.fulfilledAt && (
                        <span>Fulfilled: {formatDate(order.fulfilledAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
