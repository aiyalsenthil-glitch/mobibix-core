"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  listProducts,
  type ShopProduct,
  ProductType,
} from "@/services/products.api";
import { getStockBalances, correctStock } from "@/services/stock.api";
import { stockIn } from "@/services/inventory.api";

interface StockCorrectionFormProps {
  shopId: string;
  preSelectedProductId?: string;
  source?: "PRODUCT_CREATE" | "INVENTORY_PAGE";
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CORRECTION_REASONS = [
  { value: "PHYSICAL_COUNT", label: "Physical count mismatch" },
  { value: "PURCHASE_LATE", label: "Purchase entered late" },
  { value: "DAMAGED_LOST", label: "Damaged / lost items" },
  { value: "INITIAL_SETUP", label: "Initial stock setup" },
  { value: "OTHER", label: "Other" },
];

export function StockCorrectionForm({
  shopId,
  preSelectedProductId,
  source,
  onSuccess,
  onCancel,
}: StockCorrectionFormProps) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [stockBalances, setStockBalances] = useState<
    Record<string, { stockQty: number; isNegative: boolean }>
  >({});
  const [selectedProductId, setSelectedProductId] = useState(
    preSelectedProductId || "",
  );
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState(""); // Cost input for stock correction
  const [imeisText, setImeisText] = useState("");
  const [reason, setReason] = useState(
    source === "PRODUCT_CREATE" ? "INITIAL_SETUP" : "",
  );
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [shopId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError("");

      const [productsData, balancesData] = await Promise.all([
        listProducts(shopId),
        getStockBalances(shopId),
      ]);

      // Filter: INVENTORY_PAGE only allows non-serialized. PRODUCT_CREATE allows both.
      const eligibleProducts = productsData.filter((p) => {
        if (p.type === ProductType.SERVICE) return false;
        if (source === "PRODUCT_CREATE") return true;
        return !p.isSerialized;
      });
      setProducts(eligibleProducts);

      // Index balances by product ID
      const balancesMap = balancesData.reduce(
        (acc, b) => {
          acc[b.productId] = { stockQty: b.stockQty, isNegative: b.isNegative };
          return acc;
        },
        {} as Record<string, { stockQty: number; isNegative: boolean }>,
      );
      setStockBalances(balancesMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentStock = stockBalances[selectedProductId]?.stockQty ?? 0;
  const isCurrentlyNegative =
    stockBalances[selectedProductId]?.isNegative ?? false;

  // For serialized products, quantity is derived from IMEI lines
  const imeis = imeisText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const quantityValue = selectedProduct?.isSerialized
    ? imeis.length
    : parseFloat(quantity) || 0;

  const projectedStock = currentStock + quantityValue;
  const willRemainNegative = projectedStock < 0;

  const isFormValid =
    selectedProductId &&
    (selectedProduct?.isSerialized ? imeis.length > 0 : quantityValue !== 0) &&
    reason &&
    (source === "PRODUCT_CREATE" || quantityValue > 0) && // For IN corrections, ensure cost set
    (source === "INVENTORY_PAGE" && quantityValue > 0
      ? parseFloat(costPrice) > 0
      : true) &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!isFormValid || !selectedProduct) return;

    try {
      setIsSubmitting(true);
      setError("");

      if (source === "PRODUCT_CREATE") {
        // For initial setup, require cost input
        const cost = parseFloat(costPrice);
        if (!cost || cost <= 0) {
          setError("Cost must be greater than 0 for initial stock setup");
          setIsSubmitting(false);
          return;
        }

        await stockIn(shopId, {
          shopProductId: selectedProductId,
          quantity: quantityValue,
          costPrice: cost, // Use provided cost instead of 0
          imeis: selectedProduct.isSerialized ? imeis : undefined,
          type: selectedProduct.isSerialized ? "GOODS" : undefined,
        });
      } else {
        // For corrections, cost is optional but should be provided if available
        const cost = costPrice ? parseFloat(costPrice) : undefined;
        if (cost !== undefined && cost <= 0) {
          setError("Cost must be greater than 0");
          setIsSubmitting(false);
          return;
        }

        await correctStock({
          shopId,
          shopProductId: selectedProductId,
          quantity: quantityValue,
          reason,
          note: note.trim() || undefined,
          costPrice: cost, // Pass cost if provided
        });
      }

      // Success
      setShowConfirmModal(false);
      if (onSuccess) {
        onSuccess();
      } else {
        // Reset form
        setSelectedProductId("");
        setQuantity("");
        setReason("");
        setNote("");
        await loadData(); // Refresh stock data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to correct stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        {source === "PRODUCT_CREATE" && (
          <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-200">
            <div className="font-bold flex items-center gap-2 mb-1">
              <span>⚠️</span> ERP GUIDANCE
            </div>
            <p className="leading-relaxed">
              Stock initialization <strong>bypasses</strong> purchase entry. Use
              this ONLY for opening stock or manual migration. For normal
              inventory intake, please use <strong>New Purchase</strong>.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label
            htmlFor="product"
            className="text-slate-700 dark:text-slate-300"
          >
            Product
          </Label>
          <Select
            value={selectedProductId}
            onValueChange={setSelectedProductId}
            disabled={!!preSelectedProductId}
          >
            <SelectTrigger
              id="product"
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50"
            >
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProduct && (
          <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Product:
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-50">
                {selectedProduct.name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Current Stock:
              </span>
              <span
                className={`font-medium ${isCurrentlyNegative ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-50"}`}
              >
                {currentStock}
              </span>
            </div>
            {quantityValue !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  After Correction:
                </span>
                <span
                  className={`font-medium ${projectedStock < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                >
                  {projectedStock}
                </span>
              </div>
            )}
          </div>
        )}

        {selectedProduct && willRemainNegative && quantityValue !== 0 && (
          <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-200">
            ⚠️ Stock will still be negative after correction
          </div>
        )}

        {selectedProduct?.isSerialized ? (
          <div className="space-y-2">
            <Label
              htmlFor="imeis"
              className="text-slate-700 dark:text-slate-300"
            >
              IMEIs / Serial Numbers{" "}
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                (One per line)
              </span>
            </Label>
            <Textarea
              id="imeis"
              value={imeisText}
              onChange={(e) => setImeisText(e.target.value)}
              placeholder="Enter one IMEI per line..."
              rows={5}
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 font-mono text-sm"
            />
            <p className="text-xs font-medium text-slate-500">
              Total Count: {imeis.length} products
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label
              htmlFor="quantity"
              className="text-slate-700 dark:text-slate-300"
            >
              Quantity Adjustment{" "}
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                (Positive = add, Negative = reduce)
              </span>
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. -5 or +10"
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50"
            />
            {quantity !== "" && quantityValue === 0 && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Quantity cannot be zero
              </p>
            )}
          </div>
        )}

        {/* Cost Input - Show for initial setup or when adding stock */}
        {source === "PRODUCT_CREATE" || quantityValue > 0 ? (
          <div className="space-y-2">
            <Label
              htmlFor="costPrice"
              className="text-slate-700 dark:text-slate-300"
            >
              Cost Price (₹) <span className="text-red-600">*</span>
            </Label>
            <Input
              id="costPrice"
              type="number"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="Cost per unit"
              min="0.01"
              step="0.01"
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50"
            />
            <p
              className={`text-xs ${source === "PRODUCT_CREATE" ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-600 dark:text-slate-400"}`}
            >
              {source === "PRODUCT_CREATE"
                ? "⚠️ Stock added without cost cannot be sold. Enter cost to make sellable."
                : "💡 Cost is required to make this stock sellable."}
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label
            htmlFor="reason"
            className="text-slate-700 dark:text-slate-300"
          >
            Reason
          </Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger
              id="reason"
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50"
            >
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              {CORRECTION_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note" className="text-slate-700 dark:text-slate-300">
            Note (Optional)
          </Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Additional details..."
            rows={3}
            className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50"
          />
        </div>

        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={() => setShowConfirmModal(true)}
            disabled={!isFormValid}
            className="bg-teal-600 dark:bg-teal-500 hover:bg-teal-700 dark:hover:bg-teal-600 text-white"
          >
            Submit Correction
          </Button>
        </div>
      </div>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-50">
              Confirm Stock Correction
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Are you sure you want to {quantityValue > 0 ? "add" : "reduce"}{" "}
              <strong>{Math.abs(quantityValue)}</strong> units for{" "}
              <strong>{selectedProduct?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                Current Stock:
              </span>
              <span className="text-slate-900 dark:text-slate-50">
                {currentStock}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                Adjustment:
              </span>
              <span
                className={
                  quantityValue > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {quantityValue > 0 ? "+" : ""}
                {quantityValue}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-slate-900 dark:text-slate-50">
                New Stock:
              </span>
              <span
                className={
                  projectedStock < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-900 dark:text-slate-50"
                }
              >
                {projectedStock}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isSubmitting}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-teal-600 dark:bg-teal-500 hover:bg-teal-700 dark:hover:bg-teal-600 text-white"
            >
              {isSubmitting ? "Submitting..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
