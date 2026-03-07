"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listInvoices,
  type SalesInvoice,
  type InvoiceStatus,
  type PaymentMode,
  type PaymentStatus,
} from "@/services/sales.api";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { CollectPaymentModal } from "@/components/sales/CollectPaymentModal";
import { CancelInvoiceModal } from "@/components/sales/CancelInvoiceModal";
import { JobCardsTabs } from "@/components/jobcards/JobCardsTabs";

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
  FINAL: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  PARTIALLY_PAID: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  CREDIT:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  VOIDED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  PARTIALLY_PAID:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  UNPAID: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
};

const PAYMENT_BADGES: Record<PaymentMode, string> = {
  CASH: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-200",
  UPI: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  CARD: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  BANK: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  CREDIT:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
};

export default function JobCardBillsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { authUser } = useAuth();
  const {
    shops,
    selectedShopId,
    isLoadingShops,
    selectShop,
    hasMultipleShops,
  } = useShop();
          isOpen={!!collectingInvoice}
          onClose={() => setCollectingInvoice(null)}
          onSuccess={() => {
            setCollectingInvoice(null);
            reload();
          }}
        />
      )}

      {cancellingInvoice && (
        <CancelInvoiceModal
          isOpen={!!cancellingInvoice}
          invoiceId={cancellingInvoice.id}
          invoiceNumber={cancellingInvoice.number}
          onClose={() => setCancellingInvoice(null)}
          onSuccess={() => {
            setCancellingInvoice(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
