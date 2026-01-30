"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getNegativeStockReport,
  type NegativeStockItem,
} from "@/services/stock.api";
import { useShop } from "@/context/ShopContext";

export default function NegativeStockReportPage() {
  const router = useRouter();
  const { selectedShopId } = useShop();
  const [items, setItems] = useState<NegativeStockItem[]>([]);
  const [uniqueShops, setUniqueShops] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedShop, setSelectedShop] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadReport();
  }, [selectedShop, retryCount]);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      setError("");

      const shopIdParam = selectedShop !== "ALL" ? selectedShop : undefined;
      const response = await getNegativeStockReport(shopIdParam);

      // Handle both response formats: { items: [...] } or [...]
      const reportItems = Array.isArray(response)
        ? response
        : response?.items || [];
      setItems(reportItems);

      // Extract unique shops from response
      const shopsMap = new Map<string, string>();
      reportItems.forEach((item) => {
        shopsMap.set(item.shopId, item.shopName);
      });
      setUniqueShops(
        Array.from(shopsMap.entries()).map(([id, name]) => ({ id, name })),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load negative stock report",
      );
      setItems([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const handleCorrectStock = (item: NegativeStockItem) => {
    router.push(
      `/inventory/stock-correction?shopId=${item.shopId}&productId=${item.shopProductId}`,
    );
  };

  const filteredItems = items
    .filter((item) => {
      if (severityFilter === "ALL") return true;
      if (severityFilter === "SEVERE") return item.currentStock <= -10;
      if (severityFilter === "MODERATE")
        return item.currentStock <= -5 && item.currentStock > -10;
      return true;
    })
    .sort((a, b) => a.currentStock - b.currentStock); // Sort by most negative first

  const getSeverityBadge = (stock: number) => {
    if (stock <= -10) {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-600 dark:bg-red-700 text-white dark:text-red-100 shadow-sm">
          Severe
        </span>
      );
    }
    if (stock <= -5) {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500 dark:bg-orange-600 text-white dark:text-orange-100 shadow-sm">
          Critical
        </span>
      );
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              Negative Stock Report
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Products with negative inventory levels
            </p>
          </div>
          <Button
            onClick={() => router.push("/inventory/stock-correction")}
            className="bg-teal-600 dark:bg-teal-500 hover:bg-teal-700 dark:hover:bg-teal-600 text-white"
          >
            Manual Stock Correction
          </Button>
        </div>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-50">
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Shop
                </label>
                <Select value={selectedShop} onValueChange={setSelectedShop}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50">
                    <SelectValue placeholder="Select shop" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="ALL">All Shops</SelectItem>
                    {uniqueShops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Stock Severity
                </label>
                <Select
                  value={severityFilter}
                  onValueChange={setSeverityFilter}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="ALL">All Negative Stock</SelectItem>
                    <SelectItem value="MODERATE">Moderate (≤ -5)</SelectItem>
                    <SelectItem value="SEVERE">Severe (≤ -10)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-200">
                  Error
                </p>
                <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="border-red-300 dark:border-red-700 text-red-900 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/50"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-slate-500 dark:text-slate-400">
                  Loading report...
                </div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12">
                <p className="text-slate-600 dark:text-slate-400 text-center">
                  {items.length === 0
                    ? "No negative stock items. Inventory is healthy."
                    : "No products match the selected filters"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <TableRow>
                    <TableHead className="text-slate-700 dark:text-slate-300">
                      Product
                    </TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300">
                      Shop
                    </TableHead>
                    <TableHead className="text-right text-slate-700 dark:text-slate-300">
                      Current Stock
                    </TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300">
                      Negative Since
                    </TableHead>
                    <TableHead className="text-right text-slate-700 dark:text-slate-300">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow
                      key={`${item.shopId}-${item.shopProductId}`}
                      className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <TableCell className="font-medium text-slate-900 dark:text-slate-50">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {item.shopName}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono text-red-600 dark:text-red-400 font-semibold">
                            {item.currentStock}
                          </span>
                          {getSeverityBadge(item.currentStock)}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {formatDate(item.firstNegativeDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCorrectStock(item)}
                          className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Correct Stock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {!isLoading && filteredItems.length > 0 && (
          <div className="text-sm text-slate-600 dark:text-slate-400 text-center">
            Showing {filteredItems.length} of {items.length} products with
            negative stock
          </div>
        )}
      </div>
    </div>
  );
}
