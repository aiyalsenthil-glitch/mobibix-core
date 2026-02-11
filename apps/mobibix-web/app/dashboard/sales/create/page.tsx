"use client";

import { useRouter } from "next/navigation";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";

export default function CreateInvoicePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create New Invoice
          </h1>
          <p className="mt-2 text-gray-600">
            Fill in the details below to create a new sales invoice with GST
            calculation
          </p>
        </div>

        {/* Invoice Form */}
        <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
          <InvoiceForm
            onSuccess={(invoiceId) => {
              // Redirect to invoice details page
              router.push(`/dashboard/sales/${invoiceId}`);
            }}
            onCancel={() => {
              // Go back to sales page
              router.back();
            }}
          />
        </div>
      </div>
    </div>
  );
}
