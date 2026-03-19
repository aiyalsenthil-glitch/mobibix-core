"use client";

import { useEffect, useState } from "react";
import { 
  ShoppingBag, 
  Search, 
  Package, 
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Minus,
  Plus
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
import { distributorNetworkApi, DistCatalogItem } from "@/services/distributor-network.api";
import { formatCurrency } from "@/lib/gst.utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function WholesaleBrowser({ distributorId }: { distributorId: string }) {
  const [items, setItems] = useState<DistCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isOrdering, setIsOrdering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const result = await distributorNetworkApi.getSupplierCatalog(distributorId);
        setItems(result);
      } catch (err) {
        toast({ variant: "destructive", title: "Wait!", description: "You might not be linked to this distributor yet." });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [distributorId]);

  const filtered = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.brand?.toLowerCase().includes(search.toLowerCase())
  );

  const cartCount = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const cartTotal = items.reduce((sum, item) => sum + (cart[item.id] || 0) * item.unitPrice, 0);

  const handleAddToCart = (id: string, qty: number) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + qty }));
  };

  const handlePlaceOrder = async () => {
    setIsOrdering(true);
    try {
      const payload = {
        distributorId,
        items: Object.entries(cart).map(([id, q]) => ({ catalogItemId: id, quantity: q })),
        paymentType: "CASH", // placeholder
      };
      await distributorNetworkApi.placeOrder(payload);
      toast({ title: "Order Placed! 🚀", description: "Your purchase order has been sent to the distributor." });
      setCart({});
    } catch (err: any) {
      toast({ variant: "destructive", title: "Order failed", description: err.message });
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 bg-slate-50/80 dark:bg-[#0f172a]/80 backdrop-blur-md z-10 py-4 -mx-6 px-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search supplier's wholesale catalog..." 
            className="pl-10 h-12 rounded-2xl shadow-sm border-slate-200 dark:border-slate-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-2xl gap-3 px-8 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20">
              <ShoppingBag size={20} />
              Cart ({cartCount})
              {cartCount > 0 && <span className="bg-white text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">{formatCurrency(cartTotal)}</span>}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
            <SheetHeader className="border-b pb-6">
              <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-indigo-500" />
                Purchase List
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto py-6 space-y-6">
              {Object.keys(cart).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
                  <Package className="w-16 h-16 mb-4" />
                  <p className="text-lg">Your cart is empty</p>
                </div>
              ) : (
                Object.entries(cart).map(([id, qty]) => {
                  const item = items.find(i => i.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="flex justify-between items-center group">
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 dark:text-white capitalize">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.brand} • {formatCurrency(item.unitPrice)}/pc</p>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button onClick={() => setCart(p => ({...p, [id]: Math.max(0, p[id] - 1)}))} className="p-1 hover:text-rose-500 transition-colors"><Minus size={14} /></button>
                        <span className="font-mono text-sm font-bold min-w-[2ch] text-center">{qty}</span>
                        <button onClick={() => setCart(p => ({...p, [id]: p[id] + 1}))} className="p-1 hover:text-emerald-500 transition-colors"><Plus size={14} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {cartCount > 0 && (
              <SheetFooter className="border-t pt-8 mt-auto flex flex-col gap-4">
                <div className="flex items-center justify-between w-full">
                  <span className="text-slate-500 font-medium">Estimate Total</span>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(cartTotal)}</span>
                </div>
                <Button onClick={handlePlaceOrder} disabled={isOrdering} className="w-full h-14 rounded-2xl text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30">
                  {isOrdering ? "Sending PO..." : "Place Bulk Order"}
                  <ChevronRight size={20} className="ml-2" />
                </Button>
              </SheetFooter>
            )}
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          [1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-xl">Your supplier hasn't listed any items yet.</p>
          </div>
        ) : (
          filtered.map(item => (
            <Card key={item.id} className="group border-none shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 bg-white dark:bg-slate-900 overflow-hidden rounded-3xl border border-white/10">
              <CardHeader className="p-0 aspect-square bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
                {item.images?.[0] ? (
                  <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <Package className="w-12 h-12 text-slate-300" />
                )}
                {item.stockQuantity < 5 && (
                  <Badge variant="destructive" className="absolute top-4 right-4">Low Stock</Badge>
                )}
              </CardHeader>
              <CardContent className="p-5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white capitalize line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-tight">{item.brand || 'No Brand'}</p>
                  </div>
                  <Badge variant="outline" className="bg-indigo-50/50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900">
                    {item.category}
                  </Badge>
                </div>
                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(item.unitPrice)}</span>
                  <span className="text-xs text-slate-500 font-medium font-mono">/ pc</span>
                </div>
              </CardContent>
              <CardFooter className="p-5 pt-0">
                {(cart[item.id] || 0) > 0 ? (
                   <div className="flex items-center justify-between w-full h-11 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl px-1">
                      <button onClick={() => setCart(p => ({ ...p, [item.id]: Math.max(0, p[item.id] - 1) }))} className="p-2 text-indigo-600 dark:text-indigo-400 hover:scale-125 transition-transform"><Minus size={18} /></button>
                      <span className="font-black text-indigo-700 dark:text-indigo-300">{cart[item.id]} in cart</span>
                      <button onClick={() => setCart(p => ({ ...p, [item.id]: p[item.id] + 1 }))} className="p-2 text-indigo-600 dark:text-indigo-400 hover:scale-125 transition-transform"><Plus size={18} /></button>
                   </div>
                ) : (
                  <Button 
                    onClick={() => handleAddToCart(item.id, 1)}
                    className="w-full rounded-2xl h-11 bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all font-bold group"
                  >
                    Add to List
                    <Plus size={18} className="ml-2 group-hover:rotate-90 transition-transform" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
