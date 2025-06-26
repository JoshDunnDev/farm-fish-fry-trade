import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

async function getPriceSummary() {
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: ["OPEN", "FULFILLED"],
      },
    },
    select: {
      itemName: true,
      tier: true,
      pricePerUnit: true,
      amount: true,
      status: true,
    },
  });

  const priceMap = new Map<string, { total: number; count: number }>();

  orders.forEach((order) => {
    const key = `${order.itemName}-${order.tier}`;
    if (!priceMap.has(key)) {
      priceMap.set(key, { total: 0, count: 0 });
    }
    const current = priceMap.get(key)!;
    current.total += order.pricePerUnit;
    current.count += 1;
  });

  return Array.from(priceMap.entries())
    .map(([key, data]) => {
      const [itemName, tierStr] = key.split("-");
      return {
        itemName,
        tier: parseInt(tierStr),
        averagePrice: data.total / data.count,
      };
    })
    .sort((a, b) => a.itemName.localeCompare(b.itemName) || a.tier - b.tier);
}

async function getLeaderboards() {
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

  // Top buyers by quantity
  const topBuyers = await prisma.order.groupBy({
    by: ["creatorId"],
    where: {
      status: "FULFILLED",
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

  const buyersWithNames = await Promise.all(
    topBuyers.map(async (buyer) => {
      const user = await prisma.user.findUnique({
        where: { id: buyer.creatorId },
        select: { inGameName: true, discordName: true },
      });
      return {
        name: user?.inGameName || user?.discordName || "Unknown",
        totalPurchased: buyer._sum.amount || 0,
      };
    })
  );

  return { fulfillersWithNames, buyersWithNames };
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const [priceSummary, leaderboards] = await Promise.all([
    getPriceSummary(),
    getLeaderboards(),
  ]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to FarmFishFryTrade
        </h1>
        <p className="text-xl text-muted-foreground mt-2">
          BitCraft Trading Hub for the FarmFishFry Cohort
        </p>
        <div className="mt-6">
          <Button asChild size="lg">
            <Link href="/orders">View Orders</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Price Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Current Prices</CardTitle>
            <CardDescription>Average prices per item and tier</CardDescription>
          </CardHeader>
          <CardContent>
            {priceSummary.length === 0 ? (
              <p className="text-muted-foreground">
                No pricing data available yet
              </p>
            ) : (
              <div className="space-y-2">
                {priceSummary.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b last:border-b-0"
                  >
                    <span className="font-medium">
                      T{item.tier} {item.itemName}
                    </span>
                    <span className="text-green-600 font-semibold">
                      {item.averagePrice.toFixed(2)} Hex Coin
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboards */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Fulfillers</CardTitle>
              <CardDescription>By total quantity fulfilled</CardDescription>
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
                      <span className="text-blue-600 font-semibold">
                        {fulfiller.totalFulfilled} items
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Buyers</CardTitle>
              <CardDescription>By total quantity purchased</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboards.buyersWithNames.length === 0 ? (
                <p className="text-muted-foreground">No purchases yet</p>
              ) : (
                <div className="space-y-2">
                  {leaderboards.buyersWithNames.map((buyer, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b last:border-b-0"
                    >
                      <span className="font-medium">
                        #{index + 1} {buyer.name}
                      </span>
                      <span className="text-purple-600 font-semibold">
                        {buyer.totalPurchased} items
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
