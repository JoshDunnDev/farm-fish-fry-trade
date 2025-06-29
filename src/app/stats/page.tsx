import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/pricing";

async function getMarketStats() {
  // Total orders by status
  const orderStats = await prisma.order.groupBy({
    by: ["status"],
    _count: {
      id: true,
    },
  });

  // Get fulfilled orders to calculate volume
  const fulfilledOrders = await prisma.order.findMany({
    where: {
      status: "FULFILLED",
    },
    select: {
      pricePerUnit: true,
      amount: true,
    },
  });

  // Calculate total volume and amount
  const totalVolume = fulfilledOrders.reduce(
    (sum, order) => sum + order.pricePerUnit * order.amount,
    0
  );
  const totalAmount = fulfilledOrders.reduce(
    (sum, order) => sum + order.amount,
    0
  );

  // Most traded items
  const topItems = await prisma.order.groupBy({
    by: ["itemName"],
    where: {
      status: "FULFILLED",
    },
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        amount: "desc",
      },
    },
    take: 10,
  });

  // Get individual orders for volume calculation per item
  const fulfilledOrdersWithItems = await prisma.order.findMany({
    where: {
      status: "FULFILLED",
    },
    select: {
      itemName: true,
      pricePerUnit: true,
      amount: true,
    },
  });

  // Calculate volume per item
  const itemVolumeMap = new Map<string, number>();
  fulfilledOrdersWithItems.forEach((order) => {
    const volume = order.pricePerUnit * order.amount;
    itemVolumeMap.set(
      order.itemName,
      (itemVolumeMap.get(order.itemName) || 0) + volume
    );
  });

  // Add volume data to top items
  const topItemsWithVolume = topItems.map((item) => ({
    ...item,
    totalVolume: itemVolumeMap.get(item.itemName) || 0,
  }));

  return {
    orderStats,
    volumeStats: {
      totalVolume,
      totalAmount,
    },
    topItems: topItemsWithVolume,
  };
}

async function getLeaderboards() {
  // Get fulfilled orders to calculate volume per trader
  const fulfilledOrdersByTrader = await prisma.order.findMany({
    where: {
      status: "FULFILLED",
    },
    select: {
      creatorId: true,
      pricePerUnit: true,
      amount: true,
    },
  });

  // Calculate volume per trader
  const traderVolumeMap = new Map<string, number>();
  fulfilledOrdersByTrader.forEach((order) => {
    const volume = order.pricePerUnit * order.amount;
    traderVolumeMap.set(
      order.creatorId,
      (traderVolumeMap.get(order.creatorId) || 0) + volume
    );
  });

  // Sort traders by volume and get top 10
  const topTradersByVolume = Array.from(traderVolumeMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const tradersWithNames = await Promise.all(
    topTradersByVolume.map(async ([creatorId, totalVolume]) => {
      const user = await prisma.user.findUnique({
        where: { id: creatorId },
        select: { inGameName: true, discordName: true },
      });
      return {
        name: user?.inGameName || user?.discordName || "Unknown",
        totalVolume,
      };
    })
  );

  // Top fulfillers by quantity
  const topFulfillers = await prisma.order.groupBy({
    by: ["claimerId"],
    where: {
      status: "FULFILLED",
      claimerId: { not: null },
    },
    _sum: {
      amount: true,
    },
    orderBy: {
      _sum: {
        amount: "desc",
      },
    },
    take: 10,
  });

  const fulfillersWithNames = await Promise.all(
    topFulfillers.map(async (fulfiller) => {
      const user = await prisma.user.findUnique({
        where: { id: fulfiller.claimerId! },
        select: { inGameName: true, discordName: true },
      });
      return {
        name: user?.inGameName || user?.discordName || "Unknown",
        totalFulfilled: fulfiller._sum.amount || 0,
      };
    })
  );

  // Most active traders (by number of orders)
  const mostActiveTraders = await prisma.order.groupBy({
    by: ["creatorId"],
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: 10,
  });

  const activeTraderNames = await Promise.all(
    mostActiveTraders.map(async (trader) => {
      const user = await prisma.user.findUnique({
        where: { id: trader.creatorId },
        select: { inGameName: true, discordName: true },
      });
      return {
        name: user?.inGameName || user?.discordName || "Unknown",
        orderCount: trader._count.id,
      };
    })
  );

  return { tradersWithNames, fulfillersWithNames, activeTraderNames };
}

export default async function StatsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const [marketStats, leaderboards] = await Promise.all([
    getMarketStats(),
    getLeaderboards(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Trading Statistics</h1>
        <p className="text-muted-foreground">
          Market insights and trading data for FarmyFishFry
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Market Overview Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(marketStats.volumeStats.totalVolume)}
            </div>
            <p className="text-xs text-muted-foreground">
              {marketStats.volumeStats.totalAmount} items traded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketStats.orderStats.find((s) => s.status === "OPEN")?._count
                .id || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketStats.orderStats.find((s) => s.status === "IN_PROGRESS")
                ?._count.id || 0}
            </div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketStats.orderStats.find((s) => s.status === "FULFILLED")
                ?._count.id || 0}
            </div>
            <p className="text-xs text-muted-foreground">Successfully traded</p>
          </CardContent>
        </Card>
      </div>

      {/* Most Traded Items */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Most Traded Items</CardTitle>
          <CardDescription>By total quantity traded</CardDescription>
        </CardHeader>
        <CardContent>
          {marketStats.topItems.length === 0 ? (
            <p className="text-muted-foreground">No trading data yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketStats.topItems.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div>
                    <span className="font-medium capitalize">
                      #{index + 1} {item.itemName}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {item._count.id} orders • {formatPrice(item.totalVolume)}{" "}
                      volume
                    </p>
                  </div>
                  <span className="text-foreground font-semibold">
                    {item._sum.amount} items
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Traders by Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Top Traders by Volume</CardTitle>
            <CardDescription>By total HC traded</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboards.tradersWithNames.length === 0 ? (
              <p className="text-muted-foreground">No trading data yet</p>
            ) : (
              <div className="space-y-2">
                {leaderboards.tradersWithNames.map((trader, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b last:border-b-0"
                  >
                    <span className="font-medium">
                      #{index + 1} {trader.name}
                    </span>
                    <span className="text-foreground font-semibold font-mono">
                      {formatPrice(trader.totalVolume)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Fulfillers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Fulfillers</CardTitle>
            <CardDescription>By quantity fulfilled</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboards.fulfillersWithNames.length === 0 ? (
              <p className="text-muted-foreground">No fulfilled orders yet</p>
            ) : (
              <div className="space-y-2">
                {leaderboards.fulfillersWithNames.map((fulfiller, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b last:border-b-0"
                  >
                    <span className="font-medium">
                      #{index + 1} {fulfiller.name}
                    </span>
                    <span className="text-foreground font-semibold">
                      {fulfiller.totalFulfilled} items
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Active Traders */}
        <Card>
          <CardHeader>
            <CardTitle>Most Active Traders</CardTitle>
            <CardDescription>By number of orders</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboards.activeTraderNames.length === 0 ? (
              <p className="text-muted-foreground">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {leaderboards.activeTraderNames.map((trader, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b last:border-b-0"
                  >
                    <span className="font-medium">
                      #{index + 1} {trader.name}
                    </span>
                    <span className="text-foreground font-semibold">
                      {trader.orderCount} orders
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
