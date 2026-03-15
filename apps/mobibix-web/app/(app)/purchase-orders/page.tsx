"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  listPurchaseOrders,
  type PurchaseOrder,
  type POStatus,
} from "@/services/purchase-orders.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { NoShopsAlert } from "../components/NoShopsAlert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Plus, 
  Store,
  FileText,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<POStatus, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Draft", color: "bg-gray-500/15 text-gray-400 border-gray-500/20", icon: FileText },
  ORDERED: { label: "Ordered", color: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: Clock },
  DISPATCHED: { label: "Dispatched", color: "bg-purple-500/15 text-purple-400 border-purple-500/20", icon: Truck },
  PARTIALLY_RECEIVED: { label: "Partial", color: "bg-amber-500/15 text-amber-400 border-amber-500/20", icon: AlertCircle },
  RECEIVED: { label: "Received", color: "bg-green-500/15 text-green-400 border-green-500/20", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "bg-red-500/15 text-red-500 border-red-500/20", icon: XCircle },
};

export default function PurchaseOrdersPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const {
    shops,
    selectedShopId,
    isLoadingShops,
    error: shopsError,
    selectShop,
  } = useShop();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOrders = async () => {
    if (!selectedShopId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await listPurchaseOrders(selectedShopId);
      setOrders(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedShopId]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const query = searchQuery.toLowerCase();
    return orders.filter(o => 
      o.poNumber.toLowerCase().includes(query) || 
      o.supplierName.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  const isDark = theme === "dark";

  if (shops.length === 0 && !isLoadingShops) {
    return <NoShopsAlert />;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
              Purchase Orders
            </h1>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Planning and tracking procurement intent
            </p>
          </div>
          
          <button
            onClick={() => router.push("/purchase-orders/new")}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md transition-all active:scale-95"
          >
            <Plus size={18} />
            <span>Create PO</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className={`mb-6 p-4 rounded-xl border flex flex-col md:flex-row gap-4 justify-between items-center ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <div className="w-full md:w-auto min-w-[250px]">
             <div className="relative">
                <Store className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                <select
                  value={selectedShopId || ""}
                  onChange={(e) => selectShop(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm font-medium outline-none transition-all ${
                    isDark 
                      ? "bg-gray-900 border-gray-700 text-white" 
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="">Select Shop</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
             </div>
          </div>

          <div className="w-full md:w-auto relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
            <input 
              type="text"
              placeholder="Search POs or Suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full md:w-[300px] pl-10 pr-4 py-2 rounded-lg border text-sm outline-none transition-all ${
                isDark 
                  ? "bg-gray-900 border-gray-700 text-white placeholder-gray-500" 
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
              }`}
            />
          </div>
        </div>

        {/* Content */}
        <div className={`rounded-xl border shadow-sm overflow-hidden ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
               <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
               <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading orders...</p>
            </div>
          ) : !selectedShopId ? (
            <div className="py-20 text-center">
              <p className={isDark ? "text-gray-400" : "text-gray-500"}>Select a shop to view purchase orders</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className={`text-lg font-medium ${isDark ? "text-white" : "text-gray-900"}`}>No orders found</h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Start by creating your first purchase order.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className={isDark ? "border-gray-700 hover:bg-transparent" : "border-gray-100 hover:bg-transparent"}>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const status = STATUS_CONFIG[order.status];
                  const Icon = status.icon;
                  return (
                    <TableRow 
                      key={order.id} 
                      className={`cursor-pointer ${isDark ? "border-gray-700 hover:bg-gray-700/30" : "border-gray-100 hover:bg-gray-50"}`}
                      onClick={() => router.push(`/purchase-orders/${order.id}`)}
                    >
                      <TableCell className="font-bold text-blue-500">#{order.poNumber}</TableCell>
                      <TableCell className="font-medium">{order.supplierName}</TableCell>
                      <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell>{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        <Badge className={`${status.color} border font-medium flex items-center gap-1.5 w-fit px-2 py-0.5`}>
                          <Icon size={12} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <button className="text-xs font-semibold px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                          View
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
