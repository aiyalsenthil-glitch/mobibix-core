"use client";

import { useState } from "react";
import { 
  type PurchaseOrder 
} from "@/services/purchase-orders.api";
import { 
  createGrn, 
  confirmGrn,
  type CreateGRNDto 
} from "@/services/grn.api";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { useTheme } from "@/context/ThemeContext";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface CreateGrnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder;
  onSuccess: () => void;
}

export function CreateGrnModal({ open, onOpenChange, order, onSuccess }: CreateGrnModalProps) {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  
  // Local state for quantities
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>(
    order.items.reduce((acc, item) => ({ 
      ...acc, 
      [item.id]: Math.max(0, item.quantity - item.receivedQuantity) 
    }), {})
  );

  const handleQtyChange = (itemId: string, val: string) => {
    const qty = parseFloat(val) || 0;
    setReceivedQtys(prev => ({ ...prev, [itemId]: qty }));
  };

  const handleSaveAndConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dto: CreateGRNDto = {
        shopId: order.shopId,
        poId: order.id,
        grnNumber: `GRN-${Date.now().toString().slice(-6)}`, // Temporary generated number
        receivedDate: new Date().toISOString().split('T')[0],
        items: order.items.map(item => ({
          poItemId: item.id,
          shopProductId: item.shopProductId,
          receivedQuantity: receivedQtys[item.id] || 0,
          uom: item.uom,
          confirmedPrice: item.price,
        })).filter(i => i.receivedQuantity > 0)
      };

      if (dto.items.length === 0) {
        throw new Error("Please enter received quantity for at least one item.");
      }

      const grn = await createGrn(dto);
      await confirmGrn(grn.id);
      
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record receipt");
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${isDark ? "bg-gray-900 border-gray-800 text-white" : "bg-white"}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="text-blue-500" size={20} />
            Receive Goods: #{order.poNumber}
          </DialogTitle>
        </DialogHeader>

        {!confirmStep ? (
          <div className="space-y-4 py-4">
            <div className={`p-3 rounded-lg flex items-start gap-3 text-sm ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-700"}`}>
              <Info size={16} className="mt-0.5" />
              <p>Enter quantities received for each item. Partial receipts are allowed.</p>
            </div>

            <div className="max-h-[40vh] overflow-y-auto space-y-3">
              {order.items.map(item => {
                const remaining = item.quantity - item.receivedQuantity;
                return (
                  <div key={item.id} className={`p-3 rounded-lg border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm">{item.description}</p>
                        <p className="text-xs opacity-70">
                          Ordered: {item.quantity} | Already Received: {item.receivedQuantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${remaining > 0 ? "text-amber-500" : "text-green-500"}`}>
                          Pending: {remaining}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium">Quantity Receiving:</label>
                      <input 
                        type="number"
                        min="0"
                        max={remaining}
                        value={receivedQtys[item.id] ?? 0}
                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                        className={`w-24 px-2 py-1 rounded border text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                          isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-300"
                        }`}
                      />
                      <span className="text-xs opacity-50">{item.uom || 'units'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <DialogFooter className="gap-2">
              <button 
                onClick={() => onOpenChange(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
              >
                Cancel
              </button>
              <button 
                onClick={() => setConfirmStep(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
              >
                Next: Verification
              </button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-6 py-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse">
                <AlertCircle size={32} />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Heads Up!</h3>
              <p className={`text-sm opacity-80 max-w-sm mx-auto`}>
                This will increase physical stock levels and update weighted average costs (WAC) for these products immediately.
              </p>
              <p className="text-sm font-bold text-amber-500 uppercase tracking-wider">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSaveAndConfirm}
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Confirm & Increase Stock
                  </>
                )}
              </button>
              <button 
                onClick={() => setConfirmStep(false)}
                disabled={isLoading}
                className={`w-full py-2 rounded-lg text-sm font-medium opacity-60 hover:opacity-100 transition-opacity`}
              >
                Back to Quantities
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Sub-component icons
function Truck(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={props.size || 24} 
      height={props.size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={props.className}
    >
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-3v10" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}
