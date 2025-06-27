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

  const handleMarkReady = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/ready`, {
        method: "POST",
      });

      if (response.ok) {
        fetchOrders(); // Refresh orders
      } else {
        const error = await response.json();
        alert(error.error || "Failed to mark order as ready");
      }
    } catch (error) {
      console.error("Error marking order as ready:", error);
      alert("Failed to mark order as ready");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) {
      return;
    }

    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchOrders(); // Refresh orders
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete order");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Failed to delete order");
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
            <div key={i} className="w-16 h-6 bg-muted animate-pulse rounded"></div>
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

  const filteredOrders = (activeTab === "all" ? orders : myOrders).filter(
    (order) => {
      // On "All" tab, exclude fulfilled orders
      if (activeTab === "all" && order.status === "FULFILLED") {
        return false;
      }
      
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
      readyToTrade: orderList.filter((order) => order.status === "READY_TO_TRADE")
        .length,
      fulfilled: orderList.filter((order) => order.status === "FULFILLED")
        .length,
      buy: orderList.filter((order) => order.orderType === "BUY").length,
      sell: orderList.filter((order) => order.orderType === "SELL").length,
    };
  };

  // Get counts based on what's actually shown (excluding fulfilled on "all" tab)
  const countsSource = activeTab === "all" 
    ? orders.filter(order => order.status !== "FULFILLED")
    : myOrders;
  const counts = getOrderCounts(countsSource);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatPrice = (price: number) => {
    // Remove unnecessary trailing zeros and add HC suffix
    return price % 1 === 0 ? `${price.toFixed(0)} HC` : `${price.toFixed(3).replace(/\.?0+$/, '')} HC`;
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
        <Button asChild size="sm" className="bg-green-800 hover:bg-green-700 text-white">
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
            All ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("my")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === "my"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mine ({myOrders.length})
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
        <span className="px-2 py-1 bg-green-800 text-white dark:bg-green-700 rounded">
          Open: {counts.open}
        </span>
        <span className="px-2 py-1 bg-amber-800 text-white dark:bg-amber-700 rounded">
          In Progress: {counts.inProgress}
        </span>
        <span className="px-2 py-1 bg-blue-800 text-white dark:bg-blue-700 rounded">
          Ready: {counts.readyToTrade}
        </span>
        <span className="px-2 py-1 bg-slate-800 text-white dark:bg-slate-700 rounded">
          Fulfilled: {counts.fulfilled}
        </span>
        <span className="px-2 py-1 bg-slate-900 text-white dark:bg-slate-800 rounded">
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
                     <th className="text-left px-3 py-2 font-medium">Item & Date</th>
                     <th className="text-left px-2 py-2 font-medium">Type</th>
                     <th className="text-left px-2 py-2 font-medium">Status</th>
                     <th className="text-left px-2 py-2 font-medium">Amount</th>
                     <th className="text-left px-2 py-2 font-medium">Price/Unit</th>
                     <th className="text-left px-2 py-2 font-medium">Total</th>
                     <th className="text-left px-2 py-2 font-medium">Creator</th>
                     <th className="text-left px-2 py-2 font-medium">Claimer</th>
                     <th className="text-left px-3 py-2 font-medium">Actions</th>
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
                           T{order.tier} {order.itemName}
                         </div>
                         <div className="text-xs text-muted-foreground truncate">
                           {formatDateTime(order.createdAt)}
                         </div>
                       </td>
                       <td className="px-2 py-2 text-left">
                         {order.orderType === "BUY" ? (
                           <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-800 text-white dark:bg-blue-700 dark:text-white">
                             Buy
                           </span>
                         ) : (
                           <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-800 text-white dark:bg-orange-700 dark:text-white">
                             Sell
                           </span>
                         )}
                       </td>
                       <td className="px-2 py-2 text-left">
                         {order.status === "OPEN" && (
                           <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-800 text-white dark:bg-green-700 dark:text-white">
                             Open
                           </span>
                         )}
                         {order.status === "IN_PROGRESS" && (
                           <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-800 text-white dark:bg-amber-700 dark:text-white">
                             In Progress
                           </span>
                         )}
                         {order.status === "READY_TO_TRADE" && (
                           <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-800 text-white dark:bg-blue-700 dark:text-white">
                             Ready
                           </span>
                         )}
                         {order.status === "FULFILLED" && (
                           <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-white dark:bg-slate-700 dark:text-white">
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
                         {formatPrice(Math.ceil(order.amount * order.pricePerUnit))}
                       </td>
                       <td className="px-2 py-2">
                         <div className="text-sm truncate">
                           {order.creator.inGameName || order.creator.discordName}
                         </div>
                       </td>
                       <td className="px-2 py-2">
                         <div className="text-sm truncate">
                           {order.claimer
                             ? order.claimer.inGameName || order.claimer.discordName
                             : "-"}
                         </div>
                       </td>
                       <td className="px-3 py-2">
                         <div className="flex gap-1 justify-start">
                           {canClaimOrder(order) && (
                             <Button
                               size="sm"
                               onClick={() => handleClaimOrder(order.id)}
                               className="h-6 w-20 text-xs px-2 py-1 bg-blue-800 hover:bg-blue-700 text-white"
                             >
                               Claim
                             </Button>
                           )}
                           {canMarkReady(order) && (
                             <Button
                               size="sm"
                               onClick={() => handleMarkReady(order.id)}
                               className="h-6 w-20 text-xs px-2 py-1 bg-amber-800 hover:bg-amber-700 text-white"
                             >
                               Ready
                             </Button>
                           )}
                           {canCompleteOrder(order) && (
                             <Button
                               size="sm"
                               onClick={() => handleCompleteOrder(order.id)}
                               className="h-6 w-20 text-xs px-2 py-1 bg-green-800 hover:bg-green-700 text-white"
                             >
                               Complete
                             </Button>
                           )}
                           {canDeleteOrder(order) && (
                             <Button
                               size="sm"
                               onClick={() => handleDeleteOrder(order.id)}
                               className="h-6 w-20 text-xs px-2 py-1 bg-red-800 hover:bg-red-700 text-white"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
