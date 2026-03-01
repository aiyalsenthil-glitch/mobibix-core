"use client";

import { useEffect, useState } from "react";
import { 
  getLoyaltySummary, 
  getAllLoyaltyTransactions, 
  LoyaltySummary, 
  LoyaltyTransaction 
} from "@/services/loyalty.api";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useShop } from "@/context/ShopContext";
import { 
  Gift, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  History,
  Settings as SettingsIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoyaltyDashboardPage() {
  const { selectedShopId } = useShop();
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [summaryData, historyData] = await Promise.all([
          getLoyaltySummary(undefined, undefined, selectedShopId),
          getAllLoyaltyTransactions(selectedShopId)
        ]);
        setSummary(summaryData);
        setTransactions(historyData);
      } catch (error) {
        console.error("Failed to load loyalty data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedShopId]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Loyalty Program Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your customer rewards and track points distribution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/settings?tab=loyalty">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Loyalty Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Points Issued"
          value={summary?.totalPointsIssued?.toLocaleString() || "0"}
          icon={<Gift />}
          subtext="Total points awarded"
          accentColor="emerald"
          isLoading={loading}
        />
        <MetricCard
          label="Points Redeemed"
          value={summary?.totalPointsRedeemed?.toLocaleString() || "0"}
          icon={<ArrowDownRight />}
          subtext="Points used by customers"
          accentColor="amber"
          isLoading={loading}
        />
        <MetricCard
          label="Active Balance"
          value={summary?.netPointsBalance?.toLocaleString() || "0"}
          icon={<ArrowUpRight />}
          subtext="Unclaimed points"
          accentColor="blue"
          isLoading={loading}
        />
        <MetricCard
          label="Enrolled Customers"
          value={summary?.activeCustomersWithPoints?.toLocaleString() || "0"}
          icon={<Users />}
          subtext="Customers with balance"
          accentColor="purple"
          isLoading={loading}
        />
      </div>

      {/* Transaction History */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md overflow-hidden max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm capitalize">
                <TableRow className="bg-muted/20">
                  <TableHead className="w-[180px]">Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="hidden md:table-cell">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {tx.createdAt ? format(new Date(tx.createdAt), "dd MMM yyyy, HH:mm") : "-"}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {tx.customer?.name || "Global / System"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          tx.type === "EARN" ? "default" : 
                          tx.type === "REDEEM" ? "secondary" : 
                          tx.type === "MANUAL" ? "outline" : 
                          "destructive"
                        } className="text-[10px] px-1.5 py-0">
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold text-sm ${tx.points > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        {tx.points > 0 ? `+${tx.points}` : tx.points}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[250px] hidden md:table-cell">
                        {tx.note || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground bg-muted/5">
                      <div className="flex flex-col items-center gap-2">
                        <Gift className="w-10 h-10 opacity-20" />
                        <p>No transactions found in this period.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
