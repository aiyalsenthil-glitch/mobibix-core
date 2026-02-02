"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CustomerTimeline } from "./CustomerTimeline";

interface CustomerTimelineDrawerProps {
  customerId: string;
  customerName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerTimelineDrawer({
  customerId,
  customerName,
  isOpen,
  onClose,
}: CustomerTimelineDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-gray-950 border-gray-800 text-white">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-white flex items-center gap-2">
            <span>🕒</span>
            Timeline: {customerName || "Customer"}
          </SheetTitle>
          <p className="text-xs text-gray-400">
            View all interactions, jobs, and invoices for this customer.
          </p>
        </SheetHeader>

        <CustomerTimeline customerId={customerId} />
      </SheetContent>
    </Sheet>
  );
}
