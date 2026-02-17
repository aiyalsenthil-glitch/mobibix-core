"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getInvoice, getPublicInvoice } from "@/services/sales.api";
import { getReceipt } from "@/services/receipts.api"; // New
import { getVoucher } from "@/services/vouchers.api"; // New
import { getShop } from "@/services/shops.api";
import { listProducts } from "@/services/products.api";
import { getJobCard } from "@/services/jobcard.api";
import { mapInvoiceToPrintData } from "@/lib/print/adapters/invoice.adapter";
import { mapReceiptToPrintData } from "@/lib/print/adapters/receipt.adapter"; // New
import { mapVoucherToPrintData } from "@/lib/print/adapters/voucher.adapter"; // New
import { mapJobCardToPrintData } from "@/lib/print/adapters/jobcard.adapter";
import { resolveTemplate, registerTemplate } from "@/lib/print/registry";
import { InvoiceClassic } from "@/components/print/templates/InvoiceClassic";
import { InvoiceThermal } from "@/components/print/templates/InvoiceThermal";
import { InvoiceModern } from "@/components/print/templates/InvoiceModern"; // New
import { InvoiceCorporate } from "@/components/print/templates/InvoiceCorporate"; // New
import { InvoiceCompact } from "@/components/print/templates/InvoiceCompact"; // New
import { InvoiceSimple } from "@/components/print/templates/InvoiceSimple"; // New
import { JobCardThermal } from "@/components/print/templates/JobCardThermal";
import { JobCardClassic } from "@/components/print/templates/JobCardClassic";
import { JobCardSimple } from "@/components/print/templates/JobCardSimple";
import { JobCardDetailed } from "@/components/print/templates/JobCardDetailed";
import { ReceiptPrint } from "@/components/print/templates/ReceiptPrint"; // New
import { VoucherPrint } from "@/components/print/templates/VoucherPrint"; // New
import type { PrintDocumentData, DocumentType } from "@/lib/print/types";

import { Suspense } from "react";

// Register templates
registerTemplate("INVOICE", "CLASSIC", InvoiceClassic);
registerTemplate("INVOICE", "MODERN", InvoiceModern); // New
registerTemplate("INVOICE", "CORPORATE", InvoiceCorporate); // New
registerTemplate("INVOICE", "COMPACT", InvoiceCompact); // New
registerTemplate("INVOICE", "SIMPLE", InvoiceSimple); // New
registerTemplate("INVOICE", "THERMAL", InvoiceThermal);
registerTemplate("JOBCARD", "THERMAL", JobCardThermal);
registerTemplate("JOBCARD", "CLASSIC", JobCardClassic);
registerTemplate("JOBCARD", "SIMPLE", JobCardSimple);
registerTemplate("JOBCARD", "DETAILED", JobCardDetailed);
registerTemplate("RECEIPT", "CLASSIC", ReceiptPrint); // New
registerTemplate("VOUCHER", "CLASSIC", VoucherPrint); // New

function GenericPrintContent() {
  const params = useParams<{ type: string; id: string }>();
  // We allow type in URL: /print/invoice/123 or /print/jobcard/456
  // type param is lowercase, convert to uppercase DocumentType
  const docType = params?.type?.toUpperCase() as DocumentType;
  const docId = params?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  // Optional: Allow forcing a variant via ?variant=THERMAL
  const variantParam = searchParams.get("variant")?.toUpperCase();
  const noQr = searchParams.get("noQr") === "true";

  const [data, setData] = useState<PrintDocumentData | null>(null);
  const [resolvedVariant, setResolvedVariant] = useState<string>("CLASSIC");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!docType || !docId) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let defaultVariant = "CLASSIC";

        // Routing logic based on type
        if (docType === "INVOICE") {
          // 1. Fetch data (Public API returns invoice + shop + products)
          const result: any = await getPublicInvoice(docId);
          // Cast as any initially to handle the type change smoothly or import the type if exported
          
          if (!result || !result.invoice) throw new Error("Invoice not found");

          const invoice = result.invoice;
          const shop = result.shop;
          const products = result.products || [];

          if (!shop) throw new Error("Invoice shop details missing");

          // Resolve Invoice Variant
          defaultVariant = shop.invoiceTemplate || "CLASSIC";

          const productsMap = products.reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {} as any);

          // 3. Adapt
          const printData = mapInvoiceToPrintData({
            invoice,
            shop,
            productsMap,
          });
          setData(printData);
        } else if (docType === "JOBCARD") {
          // 1. Need shopId. For now assuming it is in query param OR we must look it up.
          const shopId = searchParams.get("shopId");
          if (!shopId)
            throw new Error("Shop ID is required for Job Card printing");

          const [jobCard, shop] = await Promise.all([
            getJobCard(shopId, docId),
            getShop(shopId),
          ]);

          if (!jobCard) throw new Error("Job Card not found");

          // Resolve JobCard Variant
          defaultVariant = shop.jobCardTemplate || "THERMAL";

          const printData = mapJobCardToPrintData({ jobCard, shop });
          setData(printData);
        } else if (docType === "RECEIPT") {
          const receipt = await getReceipt(docId);
          if (!receipt) throw new Error("Receipt not found");

          const shop = await getShop(receipt.shopId);
          setData(mapReceiptToPrintData({ receipt, shop }));
          defaultVariant = "CLASSIC";
        } else if (docType === "VOUCHER") {
          const voucher = await getVoucher(docId);
          if (!voucher) throw new Error("Voucher not found");

          const shop = await getShop(voucher.shopId);
          setData(mapVoucherToPrintData({ voucher, shop }));
          defaultVariant = "CLASSIC";
        } else {
          throw new Error("Unknown document type");
        }

        setResolvedVariant(defaultVariant);
      } catch (err: any) {
        console.error("Print Load Error:", err);
        setError(err.message || "Failed to load document");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [docType, docId, searchParams]);

  // Effect to handle noQr logic cleanly after data load
  useEffect(() => {
    if (data && noQr) {
      setData((prev) => (prev ? { ...prev, qrCode: undefined } : null));
    }
  }, [data?.id, noQr]); // Only run when data ID changes or noQr changes to avoid loops

  // Auto-print effect
  useEffect(() => {
    if (data && !isLoading) {
      // const timer = setTimeout(() => {
      //     window.print();
      // }, 800);
      // return () => clearTimeout(timer);
    }
  }, [data, isLoading]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">
            Loading Document
          </p>
          <p className="text-sm text-gray-500">
            Preparing your print preview...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Error Loading Document
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Resolve Template
  // Prioritize URL param > Resolved from Shop > Default
  const variant = variantParam || resolvedVariant;
  const TemplateComponent = resolveTemplate(docType, variant);

  if (!TemplateComponent) {
    return (
      <div>
        No template found for {docType} ({variant})
      </div>
    );
  }

  return (
    <>
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                title="Go back"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span className="font-medium">Back</span>
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Print Preview
                </h1>
                <p className="text-xs text-gray-500 capitalize">
                  {docType?.toLowerCase()} #{docId}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (window.history.length > 1) {
                    router.back();
                  } else {
                    window.close();
                  }
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl font-medium"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2-4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  ></path>
                </svg>
                Print Document
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="print:m-0 mt-24 mb-20 min-h-screen bg-gray-50">
        <div className="py-8">
          <TemplateComponent data={data} />
        </div>
      </div>

      {/* Floating Print Button for Mobile/Tablet */}
      <button
        onClick={() => window.print()}
        className="print:hidden fixed bottom-8 right-8 lg:hidden w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-200 flex items-center justify-center z-40"
        title="Print Document"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2-4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          ></path>
        </svg>
      </button>

      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body {
            visibility: visible;
            -webkit-print-color-adjust: exact;
          }
          /* Hide everything by default if needed, but since we are in a dedicated route, we just rely on print:hidden classes */
        }

        /* Smooth animations */
        button {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Enhance shadow on hover */
        .shadow-2xl:hover {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </>
  );
}

export default function GenericPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <GenericPrintContent />
    </Suspense>
  );
}
