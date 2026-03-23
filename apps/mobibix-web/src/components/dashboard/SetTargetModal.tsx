"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch } from "@/services/auth.api";
import { Target, IndianRupee } from "lucide-react";

interface SetTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  onSuccess: (newTargetInPaisa: number) => void;
  initialTargetInPaisa?: number;
  currentMonth?: number;
  currentYear?: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function SetTargetModal({
  isOpen,
  onClose,
  shopId,
  onSuccess,
  initialTargetInPaisa = 0,
  currentMonth = new Date().getMonth() + 1,
  currentYear = new Date().getFullYear(),
}: SetTargetModalProps) {
  const [targetAmount, setTargetAmount] = useState<string>(
    initialTargetInPaisa > 0 ? (initialTargetInPaisa / 100).toFixed(0) : ""
  );
  const [repairTarget, setRepairTarget] = useState<string>("");
  const [salesTarget, setSalesTarget] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    const amount = Number(targetAmount);
    if (!targetAmount || isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid revenue target amount in ₹.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const amountInPaisa = Math.round(amount * 100);
      const res = await authenticatedFetch("/mobileshop/targets/shop", {
        method: "POST",
        body: JSON.stringify({
          shopId,
          year: currentYear,
          month: currentMonth,
          revenueTarget: amountInPaisa,
          repairTarget: repairTarget ? Number(repairTarget) : undefined,
          salesTarget: salesTarget ? Number(salesTarget) : undefined,
        }),
      });

      if (res.ok) {
        toast({
          title: "🎯 Target Set!",
          description: `${MONTHS[currentMonth - 1]} goal: ₹${amount.toLocaleString("en-IN")}`,
        });
        onSuccess(amountInPaisa);
        onClose();
      } else {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to set target");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Could not save your target. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const presets = [200000, 500000, 1000000, 2000000];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-primary/10">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Set Monthly Target</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground pl-[52px]">
            {MONTHS[currentMonth - 1]} {currentYear}
          </p>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Revenue Target */}
          <div className="space-y-2">
            <Label htmlFor="revenue-target" className="text-sm font-semibold">
              Revenue Goal <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="revenue-target"
                type="number"
                placeholder="e.g. 500000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="pl-9 text-lg font-semibold h-12"
              />
            </div>
            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTargetAmount((p / 1).toFixed(0))}
                  className="px-3 py-1 text-xs rounded-full border border-border hover:bg-accent hover:border-primary/50 transition-colors font-medium"
                >
                  ₹{(p / 100000).toFixed(p >= 100000 ? 0 : 1)}L
                </button>
              ))}
            </div>
          </div>

          {/* Optional targets */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="repair-target" className="text-sm">
                Repairs Goal
                <span className="text-muted-foreground text-xs ml-1">(optional)</span>
              </Label>
              <Input
                id="repair-target"
                type="number"
                placeholder="e.g. 50"
                value={repairTarget}
                onChange={(e) => setRepairTarget(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sales-target" className="text-sm">
                Units Sold Goal
                <span className="text-muted-foreground text-xs ml-1">(optional)</span>
              </Label>
              <Input
                id="sales-target"
                type="number"
                placeholder="e.g. 30"
                value={salesTarget}
                onChange={(e) => setSalesTarget(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 border border-border">
            💡 Goals are visible on the dashboard and help track shop performance. They can be updated at any time this month.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? "Saving..." : "Set Target"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
