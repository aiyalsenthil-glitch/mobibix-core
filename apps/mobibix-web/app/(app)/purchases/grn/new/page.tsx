"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PurchaseOrder, listPurchaseOrders } from "@/services/purchase-orders.api";
import { createGrn, CreateGRNDto } from "@/services/grn.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function NewGrnPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [grnItems, setGrnItems] = useState<any[]>([]);
  const [grnNumber, setGrnNumber] = useState(`GRN-${Date.now().toString().slice(-6)}`);

  useEffect(() => {
    fetchPOs();
  }, []);

  async function fetchPOs() {
    try {
      const pos = await listPurchaseOrders();
      // Filter for active POs (those that can still receive)
      const activePos = pos.filter(po => 
        po.status === "ORDERED" || po.status === "DISPATCHED" || po.status === "PARTIALLY_RECEIVED"
      );
      setPurchaseOrders(activePos);
    } catch (error) {
      console.error("Failed to fetch POs:", error);
    }
  }

  function handlePoSelect(poId: string) {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setSelectedPo(po);
      // Initialize items from PO
      const items = po.items.map(item => ({
        poItemId: item.id,
        shopProductId: item.shopProductId,
        description: item.description,
        orderedQuantity: item.quantity,
        alreadyReceived: item.receivedQuantity,
        receivedQuantity: item.quantity - item.receivedQuantity,
        confirmedPrice: item.price,
        uom: item.uom || "pcs"
      }));
      setGrnItems(items);
    }
  }

  function handleQuantityChange(index: number, val: string) {
    const items = [...grnItems];
    items[index].receivedQuantity = parseInt(val) || 0;
    setGrnItems(items);
  }

  async function handleSubmit() {
    if (!selectedPo) return;
    setLoading(true);
    try {
      const dto: CreateGRNDto = {
        shopId: selectedPo.shopId,
        poId: selectedPo.id,
        grnNumber: grnNumber,
        receivedDate: new Date().toISOString(),
        items: grnItems.filter(i => i.receivedQuantity > 0).map(i => ({
          poItemId: i.poItemId,
          shopProductId: i.shopProductId,
          receivedQuantity: i.receivedQuantity,
          confirmedPrice: i.confirmedPrice,
          uom: i.uom
        }))
      };

      await createGrn(dto);
      toast({
        title: "Receipt Created",
        description: "Draft GRN saved successfully."
      });
      router.push("/purchases/grn");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create receipt",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/purchases/grn">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Receipt</h1>
          <p className="text-muted-foreground">Record incoming goods against a Purchase Order.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>PO Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="po-select">Select Purchase Order</Label>
              <Select onValueChange={handlePoSelect}>
                <SelectTrigger id="po-select">
                  <SelectValue placeholder="Search by PO# or Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.poNumber} - {po.supplierName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grn-number">Receipt Number (GRN)</Label>
              <Input 
                id="grn-number" 
                value={grnNumber} 
                onChange={(e) => setGrnNumber(e.target.value)} 
              />
            </div>
          </CardContent>
        </Card>

        {selectedPo && (
          <Card>
            <CardHeader>
              <CardTitle>PO Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Supplier</Label>
                <div className="font-medium">{selectedPo.supplierName}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Order Date</Label>
                <div className="font-medium">{new Date(selectedPo.orderDate).toLocaleDateString()}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Currency</Label>
                <div className="font-medium uppercase">{selectedPo.currency}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="font-medium">{selectedPo.status}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedPo && (
        <Card>
          <CardHeader>
            <CardTitle>Received Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item / Description</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right w-32">Now Receiving</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grnItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="font-medium">{item.description}</div>
                      <div className="text-xs text-muted-foreground">Product ID: {item.shopProductId}</div>
                    </TableCell>
                    <TableCell className="text-right">{item.orderedQuantity} {item.uom}</TableCell>
                    <TableCell className="text-right">{item.alreadyReceived} {item.uom}</TableCell>
                    <TableCell className="text-right">
                      <Input 
                        type="number" 
                        value={item.receivedQuantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        className="text-right"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSubmit} disabled={loading || grnItems.length === 0}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
