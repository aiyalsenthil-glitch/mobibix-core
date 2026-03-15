"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getPurchaseOrder,
  transitionPOStatus,
  type PurchaseOrder,
  type POStatus,
} from "@/services/purchase-orders.api";
import { useTheme } from "@/context/ThemeContext";
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Truck, 
  AlertCircle, 
  XCircle,
  Package,
  Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateGrnModal } from "@/components/purchases/CreateGrnModal";

const STATUS_CONFIG: Record<POStatus, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Draft", color: "bg-gray-500/15 text-gray-400 border-gray-500/20", icon: FileText },
  ORDERED: { label: "Ordered", color: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: Clock },
  DISPATCHED: { label: "Dispatched", color: "bg-purple-500/15 text-purple-400 border-purple-500/20", icon: Truck },
  PARTIALLY_RECEIVED: { label: "Partial Reception", color: "bg-amber-500/15 text-amber-400 border-amber-500/20", icon: AlertCircle },
  RECEIVED: { label: "Received", color: "bg-green-500/15 text-green-400 border-green-500/20", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "bg-red-500/15 text-red-500 border-red-500/20", icon: XCircle },
};

export default function PODetailPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGrnModal, setShowGrnModal] = useState(false);

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      const data = await getPurchaseOrder(params.id as string);
      setOrder(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const handleTransition = async (newStatus: POStatus) => {
    if (!order) return;
    try {
      await transitionPOStatus(order.id, newStatus);
      fetchOrder();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const isDark = theme === "dark";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">Error Loading Order</h2>
        <p className="text-gray-500 mb-6">{error || "Order not found"}</p>
        <button onClick={() => router.back()} className="text-blue-500 flex items-center gap-2 mx-auto">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[order.status];
  const Icon = status.icon;

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto pb-20">
      {/* Back Button */}
      <button 
        onClick={() => router.push('/purchase-orders')}
        className={`flex items-center gap-2 mb-6 text-sm font-medium ${isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
      >
        <ArrowLeft size={16} /> Back to Orders
      </button>

      {/* Header Card */}
      <div className={`p-6 rounded-2xl border mb-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">PO #{order.poNumber}</h1>
              <Badge className={`${status.color} border px-2 py-0.5 flex items-center gap-1.5`}>
                <Icon size={12} />
                {status.label}
              </Badge>
            </div>
            <p className="text-lg font-medium opacity-80">{order.supplierName}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {order.status === 'DRAFT' && (
              <button 
                onClick={() => handleTransition('ORDERED')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
              >
                Approve & Mark Ordered
              </button>
            )}

            {(order.status === 'ORDERED' || order.status === 'DISPATCHED' || order.status === 'PARTIALLY_RECEIVED') && (
              <button 
                onClick={() => setShowGrnModal(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 active:scale-95"
              >
                <Truck size={18} />
                Receive Goods
              </button>
            )}

            {order.status !== 'CANCELLED' && order.status !== 'RECEIVED' && (
              <button 
                onClick={() => { if(confirm("Cancel this PO?")) handleTransition('CANCELLED') }}
                className={`px-4 py-2 rounded-xl text-sm font-medium border ${isDark ? "border-gray-700 text-gray-400 hover:bg-red-500/10 hover:text-red-400" : "border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600"}`}
              >
                Cancel PO
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8 pt-6 border-t border-dashed opacity-80">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider font-bold">Order Date</p>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar size={14} />
              {new Date(order.orderDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider font-bold">Expected By</p>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock size={14} />
              {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Asap'}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider font-bold">Currency</p>
            <p className="text-sm font-medium">{order.currency} (1 : {order.exchangeRate})</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider font-bold">Payment Due</p>
            <p className="text-sm font-medium">{order.paymentDueDays} Days</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="p-4 border-b flex items-center gap-2 font-bold">
          <Package size={18} />
          Items Detail
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className={`text-[10px] uppercase tracking-widest ${isDark ? "bg-gray-900/50 text-gray-500" : "bg-gray-50 text-gray-400"}`}>
              <th className="px-6 py-3 font-bold">Product</th>
              <th className="px-6 py-3 font-bold text-center">Ordered</th>
              <th className="px-6 py-3 font-bold text-center">Received</th>
              <th className="px-6 py-3 font-bold text-center">Unit Price</th>
              <th className="px-6 py-3 font-bold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {order.items.map((item) => {
              const total = item.quantity * item.price;
              const isFullyReceived = item.receivedQuantity >= item.quantity;
              return (
                <tr key={item.id} className={`${isDark ? "hover:bg-gray-700/30" : "hover:bg-gray-50"}`}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-sm">{item.description}</p>
                    <p className="text-xs opacity-50 font-mono">{item.id.slice(-8).toUpperCase()}</p>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium">{item.quantity} {item.uom || 'pcs'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-bold ${isFullyReceived ? "text-green-500" : item.receivedQuantity > 0 ? "text-amber-500" : ""}`}>
                      {item.receivedQuantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm">₹{item.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-bold text-sm">₹{total.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={`font-bold ${isDark ? "bg-gray-900/50" : "bg-gray-50"}`}>
              <td colSpan={4} className="px-6 py-4 text-right opacity-60">Grand Total:</td>
              <td className="px-6 py-4 text-right text-lg text-blue-500">
                ₹{order.items.reduce((sum, i) => sum + (i.quantity * i.price), 0).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {order.notes && (
        <div className={`mt-6 p-4 rounded-xl border border-dashed ${isDark ? "bg-gray-800/20 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
          <p className="text-xs font-bold uppercase mb-2">Notes</p>
          <p className="text-sm">{order.notes}</p>
        </div>
      )}

      {/* Modals */}
      <CreateGrnModal 
        open={showGrnModal} 
        onOpenChange={setShowGrnModal} 
        order={order} 
        onSuccess={() => {
          fetchOrder();
          // Optional: notify success
        }} 
      />
    </div>
  );
}
