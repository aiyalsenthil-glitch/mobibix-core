"use client";

import { useEffect, useState } from "react";
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  MoreVertical, 
  Package, 
  Tag, 
  Eye,
  Check,
  X
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
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { distributorApi, DistCatalogItem } from "@/services/distributor.api";
import { formatCurrency } from "@/lib/gst.utils";
import { useToast } from "@/hooks/use-toast";

export default function CatalogManager() {
  const [items, setItems] = useState<DistCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = async () => {
    try {
      const result = await distributorApi.getCatalog();
      if (Array.isArray(result)) {
        setItems(result);
      } else {
        setItems([]);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load catalog", description: "Could not fetch items." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.brand?.toLowerCase().includes(search.toLowerCase()) ||
    i.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const handleStockAdjust = async (id: string, current: number) => {
    const adjustmentStr = prompt("Enter adjustment amount (e.g. 10 to add, -5 to subtract):");
    if (!adjustmentStr) return;
    const adjustment = parseInt(adjustmentStr);
    if (isNaN(adjustment)) return;

    try {
      await distributorApi.adjustStock(id, adjustment);
      toast({ title: "Stock updated", description: `Successfully adjusted by ${adjustment}` });
      load();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update failed", description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search catalog by SKU, name or brand..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20">
              <Plus className="w-4 h-4" />
              Add Catalog Item
            </Button>
          </DialogTrigger>
          <CatalogItemForm onSuccess={() => { load(); toast({ title: "Item Created", description: "Successfully added to your catalog." }); }} />
        </Dialog>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900/50">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead>Product Info</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><div className="h-12 bg-slate-100 dark:bg-slate-800/50 animate-pulse rounded-lg" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-10" />
                  No items found in your catalog.
                </TableCell>
              </TableRow>
            ) : filtered.map((item) => (
              <TableRow key={item.id} className="group hover:bg-indigo-50/10 dark:hover:bg-indigo-500/5 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover rounded-lg" /> : <Tag className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white capitalize">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.brand || 'No Brand'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{item.sku || '-'}</TableCell>
                <TableCell><Badge variant="outline" className="font-normal">{item.category || 'General'}</Badge></TableCell>
                <TableCell className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(item.unitPrice)}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <p className={`text-sm font-bold ${item.stockQuantity < 10 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                      {item.stockQuantity} in stock
                    </p>
                    <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.stockQuantity < 10 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(100, (item.stockQuantity / 100) * 100)}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleStockAdjust(item.id, item.stockQuantity)} className="h-8 w-8">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CatalogItemForm({ onSuccess }: { onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    brand: "",
    category: "",
    unitPrice: "",
    stockQuantity: 0,
    description: "",
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await distributorApi.createCatalogItem(form);
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-md sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Add to Wholesale Catalog</DialogTitle>
        <DialogDescription>List a new product for your retailer network.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">Product Name</label>
            <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. iPhone 15 OLED Assembly" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">SKU / Part Number</label>
            <Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="SC-IP15-OLED" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">Category</label>
            <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Screens" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">Unit Price (Wholesale)</label>
            <Input type="number" step="0.01" required value={form.unitPrice} onChange={e => setForm({...form, unitPrice: e.target.value})} placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">Initial Stock</label>
            <Input type="number" required value={form.stockQuantity} onChange={e => setForm({...form, stockQuantity: parseInt(e.target.value)})} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500">Description</label>
          <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Features, warranty details, etc." />
        </div>
        <DialogFooter className="pt-4">
          <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {submitting ? "Processing..." : "Finish & Create Listing"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
