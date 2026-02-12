"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShopProduct } from "@/services/products.api";
import { stockIn } from "@/services/inventory.api";
import { useTheme } from "@/context/ThemeContext";

interface StockInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
  filteredProducts: ShopProduct[];
  onSuccess: () => void;
}

export function StockInModal({
  open,
  onOpenChange,
  shopId,
  filteredProducts,
  onSuccess,
}: StockInModalProps) {
  const { theme } = useTheme();
  
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedProduct(null);
      setSearchQuery("");
      setQuantity("");
      setCostPrice("");
      setError(null);
    }
  }, [open]);

  const displayedProducts = searchQuery 
    ? filteredProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredProducts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !shopId) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await stockIn(shopId, {
        shopProductId: selectedProduct.id,
        quantity: parseInt(quantity),
        costPrice: parseFloat(costPrice) || 0,
        type: selectedProduct.type,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to add stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>📦 Add Stock</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Product Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Product <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                placeholder={selectedProduct ? selectedProduct.name : "Search product..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) setSelectedProduct(null);
                }}
                className={selectedProduct ? "border-teal-500 ring-1 ring-teal-500" : ""}
              />
              
              {searchQuery && !selectedProduct && (
                <div className="absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-auto bg-popover text-popover-foreground">
                  {displayedProducts.length > 0 ? (
                    displayedProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(product);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-muted/50 border-b last:border-0 transition text-sm"
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Stock: {product.stockQty || 0} | Price: ₹{(product.salePrice / 100).toFixed(2)}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">No products found</div>
                  )}
                </div>
              )}
            </div>
            {selectedProduct && (
              <div className="text-sm text-teal-600 dark:text-teal-400 font-medium px-1">
                ✓ {selectedProduct.name} selected
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Quantity <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="1"
                placeholder="0"
              />
            </div>

            {/* Cost Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Cost (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium">
              ❌ {error}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedProduct}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isSubmitting ? "Adding..." : "Add Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
