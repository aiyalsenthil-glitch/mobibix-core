"use client";

import { useEffect, useState } from "react";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ExternalLink, 
  MapPin, 
  Phone,
  CheckCircle2,
  Clock,
  Package,
  Truck
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { distributorApi, DistOrder } from "@/services/distributor.api";
import { formatCurrency } from "@/lib/gst.utils";
import { useToast } from "@/hooks/use-toast";

export default function OrderManager() {
  const [orders, setOrders] = useState<DistOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    try {
      const result = await distributorApi.getInboundOrders();
      if (Array.isArray(result)) {
        setOrders(result);
      } else {
        setOrders([]);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load orders" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await distributorApi.updateOrderStatus(id, status);
      toast({ title: "Order Updated", description: `Order is now ${status}` });
      load();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update failed", description: err.message });
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 lg:px-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Retailer Orders
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Manage purchase orders received from your network of retailers.
        </p>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl transition-all border border-white/20">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Retailer Context</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received At</TableHead>
              <TableHead className="text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3].map(i => <TableRow key={i}><TableCell colSpan={6} className="h-20 animate-pulse bg-slate-100 dark:bg-slate-800" /></TableRow>)
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center text-slate-400">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p>No orders received yet.</p>
                </TableCell>
              </TableRow>
            ) : (
              orders.map(order => (
                <TableRow key={order.id} className="group hover:bg-indigo-50/10 dark:hover:bg-indigo-500/5 transition-colors">
                  <TableCell className="font-bold text-slate-900 dark:text-white">#{order.orderNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                        {order.retailerId.substring(0, 2)}
                      </div>
                      <span className="text-sm font-medium">Retailer ID: {order.retailerId.substring(0, 8)}...</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-lg">{formatCurrency(order.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-xl border-2 ${
                      order.status === 'PENDING' ? 'border-amber-200 text-amber-600 bg-amber-50' :
                      order.status === 'SHIPPED' ? 'border-indigo-200 text-indigo-600 bg-indigo-50' :
                      'border-emerald-200 text-emerald-600 bg-emerald-50'
                    }`}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {order.status === 'PENDING' && (
                        <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'CONFIRMED')} className="bg-emerald-600 hover:bg-emerald-700">Confirm</Button>
                      )}
                      {order.status === 'CONFIRMED' && (
                        <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'SHIPPED')} className="bg-indigo-600 hover:bg-indigo-700">Ship Now</Button>
                      )}
                      <Button variant="ghost" size="sm" className="gap-1"><ExternalLink size={14} /> Details</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
