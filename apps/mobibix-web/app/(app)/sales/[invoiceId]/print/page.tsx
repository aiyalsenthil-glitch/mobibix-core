"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInvoice, type SalesInvoice } from "@/services/sales.api";
import { getShop, type Shop } from "@/services/shops.api";
import { listProducts, type ShopProduct } from "@/services/products.api";
import { numberToIndianWords } from "@/utils/numberToWords";
import { QRCodeSVG } from "qrcode.react";

export default function PrintInvoicePage() {
  const params = useParams<{ invoiceId: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [productsMap, setProductsMap] = useState<Record<string, ShopProduct>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!params?.invoiceId) {
        setError("Missing invoice id");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);

        // console.log("Loading invoice:", params.invoiceId);
        // 1. Fetch Invoice
        const invoiceData = await getInvoice(params.invoiceId);
        setInvoice(invoiceData);
        // console.log("Invoice loaded:", invoiceData);

        // 2. Fetch Shop Details & Products
        if (invoiceData.shopId) {
          // console.log("Fetching shop and products for:", invoiceData.shopId);
          try {
            const [shopData, productsResponse] = await Promise.all([
              getShop(invoiceData.shopId),
              listProducts(invoiceData.shopId),
            ]);
            // Handle paginated response
            const productsData = Array.isArray(productsResponse)
              ? productsResponse
              : productsResponse.data;

            // console.log("Shop loaded:", shopData);
            // console.log("Products loaded:", productsData?.length);

            setShop(shopData);

            // Create product lookup map
            const pMap: Record<string, ShopProduct> = {};
            if (productsData) {
              productsData.forEach((p) => {
                pMap[p.id] = p;
              });
            }
            setProductsMap(pMap);
          } catch (innerErr) {
            console.error("Error fetching dependencies:", innerErr);
            // Don't fail the whole page if aux data fails, but log it
          }
        } else {

        }
      } catch (err: any) {
        console.error("Fatal load error:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [params?.invoiceId]);

  // Handle print with a slight delay
  const triggerPrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  useEffect(() => {
    if (invoice && shop) {
      // Auto-trigger print dialog once ready
      const timer = setTimeout(() => {
        try {
          if (!document.querySelector(".print-dialog-open")) {
            // Optional: Uncomment to auto-print
            // window.print();
          }
        } catch {}
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [invoice, shop]);

  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/${params.invoiceId}`
      : "";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">
            Loading Invoice
          </p>
          <p className="text-sm text-gray-500">Preparing your document...</p>
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
            Error Loading Invoice
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

  if (!invoice) return null;

  const isIndianGSTInvoice = !!shop?.gstEnabled && !!shop?.gstNumber;
  const isB2B = !!invoice.customerGstin;
  const placeOfSupply = invoice.customerState || shop?.state || "";

  // Check if this invoice used tax-inclusive pricing
  // (We assume if rate × qty ≈ lineTotal, prices were inclusive)
  const pricesIncludeTax =
    invoice.items?.some((item) => {
      const grossAmount = (item.rate || 0) * (item.quantity || 0);
      const lineTotal = item.lineTotal || 0;
      return Math.abs(grossAmount - lineTotal) < 1; // Within ₹1 tolerance
    }) || false;

  const stateCodeMap: Record<string, string> = {
    "TAMIL NADU": "33",
    "Tamil Nadu": "33",
  };

  const placeOfSupplyLabel = placeOfSupply
    ? `${placeOfSupply}$${
        stateCodeMap[placeOfSupply]
          ? ` (State Code: ${stateCodeMap[placeOfSupply]})`
          : ""
      }`
    : "-";

  const terms =
    shop?.terms && shop.terms.length > 0
      ? shop.terms
      : [
          "All disputes subject to local jurisdiction.",
          "Warranty void if label is tampered with.",
          "Goods once sold will not be taken back.",
        ];

  const logoUrl = shop?.logoUrl;

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Modern Control Bar - Fixed at top */}
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
                <p className="text-xs text-gray-500">
                  Invoice #{invoice?.invoiceNumber || params.invoiceId}
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
                onClick={triggerPrint}
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
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="print:hidden h-20"></div>

      {/* Invoice Container - ID used for Print targeting */}
      <div className="print:hidden pb-8"></div>
      <div
        id="invoice-print-area"
        className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:w-full rounded-lg print:rounded-none overflow-hidden"
      >
        <div className="border border-gray-200 print:border-0 p-8 print:p-0">
          {/* Header */}
          <div className="border-b border-gray-100 pb-8 mb-8">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                {logoUrl && (
                  <div className="w-20 h-20 relative mr-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {shop?.name || "Shop Name"}
                  </h1>
                  {shop?.addressLine1 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {shop.addressLine1}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    {[
                      shop?.addressLine2,
                      shop?.city,
                      shop?.state && `${shop.state} - ${shop.pincode || ""}`,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {shop?.phone && (
                    <p className="text-sm text-gray-600 mt-1">
                      Phone: {shop.phone}
                    </p>
                  )}
                  {shop?.gstNumber && (
                    <p className="text-sm text-gray-600">
                      GSTIN: {shop.gstNumber}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-800">
                  {isIndianGSTInvoice ? "Tax Invoice" : "Invoice"}
                </h2>
                {isIndianGSTInvoice && (
                  <p className="text-xs text-gray-500 mt-1">
                    GSTIN: {shop?.gstNumber || "-"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Info Bar */}
          <div className="flex justify-between mb-8">
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Billed To
              </p>
              <p className="font-bold text-gray-900">
                {invoice.customerName || "Walk-in Customer"}
              </p>
              {invoice.customerPhone && (
                <p className="text-sm text-gray-600">{invoice.customerPhone}</p>
              )}
              {invoice.customerState && (
                <p className="text-sm text-gray-600">{invoice.customerState}</p>
              )}
              {isIndianGSTInvoice && isB2B && (
                <p className="text-sm text-gray-600">
                  GSTIN: {invoice.customerGstin}
                </p>
              )}
              {isIndianGSTInvoice && !isB2B && (
                <p className="text-sm text-gray-600">
                  Buyer is unregistered under GST (B2C)
                </p>
              )}
            </div>
            <div className="text-right min-w-[200px]">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">Invoice No:</span>
                <span className="font-bold text-gray-900">
                  {invoice.invoiceNumber}
                </span>

                <span className="text-gray-500">Date:</span>
                <span className="font-bold text-gray-900">
                  {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-gray-500">Place of Supply:</span>
                <span className="font-bold text-gray-900">
                  {placeOfSupplyLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8 min-h-[200px]">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100 print:bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    S/No
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Item Description
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    HSN/SAC
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {pricesIncludeTax ? "Rate (Incl. GST)" : "Rate (Excl. GST)"}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Taxable Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items?.map((item, idx) => {
                  const product = productsMap[item.shopProductId];
                  // If product map lookup fails, fallback to ID or "Unknown"
                  // Note: If you have a separate `productName` field on item in API, use that preferred.
                  const productName = product?.name || item.shopProductId;
                  const productHsn = item.hsnCode || product?.hsnCode || "-";
                  // Use backend-provided taxableValue with 2-decimal precision
                  const taxableValue =
                    item.taxableValue ??
                    (item.lineTotal || 0) - (item.gstAmount || 0);

                  return (
                    <tr key={idx}>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {productName}
                        {product?.sku && (
                          <span className="text-xs text-gray-400 block">
                            SKU: {product.sku}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-gray-600">
                        {productHsn}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-gray-600">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">
                        ₹{item.rate.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900 font-medium">
                        ₹{taxableValue.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {/* Minimum rows filler */}
                {Array.from({
                  length: Math.max(0, 5 - (invoice.items?.length || 0)),
                }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="py-3 px-4 text-sm">&nbsp;</td>
                    <td className="py-3 px-4 text-sm">&nbsp;</td>
                    <td className="py-3 px-4 text-sm">&nbsp;</td>
                    <td className="py-3 px-4 text-sm">&nbsp;</td>
                    <td className="py-3 px-4 text-sm">&nbsp;</td>
                    <td className="py-3 px-4 text-sm">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Footer */}
          <div className="border-t border-gray-200">
            <div className="flex justify-between pt-8">
              <div className="w-[55%]">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Amount in Words
                </p>
                <p className="text-sm font-medium text-gray-900 italic capitalize mb-8 px-4 py-2 bg-gray-50 rounded">
                  {numberToIndianWords(invoice.totalAmount)} only
                </p>

                <div className="mt-8">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Terms & Conditions
                  </p>
                  <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                    {terms.map((term, i) => (
                      <li key={i}>{term}</li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="w-[40%]">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>
                      {pricesIncludeTax
                        ? "Taxable Value (Derived from Inclusive Price):"
                        : "Subtotal (Base Price):"}
                    </span>
                    <span>
                      ₹
                      {(invoice.subTotal ?? invoice.totalAmount ?? 0).toFixed(
                        2,
                      )}
                    </span>
                  </div>
                  {isIndianGSTInvoice &&
                    invoice.gstAmount !== undefined &&
                    invoice.gstAmount > 0 && (
                      <>
                        {invoice.cgst !== undefined && invoice.cgst > 0 && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>
                              CGST (
                              {invoice.cgst && invoice.subTotal
                                ? (
                                    (invoice.cgst * 100) /
                                    invoice.subTotal
                                  ).toFixed(1)
                                : "9"}
                              %):
                            </span>
                            <span>₹{invoice.cgst.toFixed(2)}</span>
                          </div>
                        )}
                        {invoice.sgst !== undefined && invoice.sgst > 0 && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>
                              SGST (
                              {invoice.sgst && invoice.subTotal
                                ? (
                                    (invoice.sgst * 100) /
                                    invoice.subTotal
                                  ).toFixed(1)
                                : "9"}
                              %):
                            </span>
                            <span>₹{invoice.sgst.toFixed(2)}</span>
                          </div>
                        )}
                        {invoice.igst !== undefined && invoice.igst > 0 && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>
                              IGST (
                              {invoice.igst && invoice.subTotal
                                ? (
                                    (invoice.igst * 100) /
                                    invoice.subTotal
                                  ).toFixed(1)
                                : "18"}
                              %):
                            </span>
                            <span>₹{invoice.igst.toFixed(2)}</span>
                          </div>
                        )}
                        {!(invoice.cgst !== undefined && invoice.cgst > 0) &&
                          !(invoice.sgst !== undefined && invoice.sgst > 0) &&
                          !(invoice.igst !== undefined && invoice.igst > 0) && (
                            <>
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>CGST:</span>
                                <span>
                                  ₹{(invoice.gstAmount / 2).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>SGST:</span>
                                <span>
                                  ₹{(invoice.gstAmount / 2).toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                        <div className="flex justify-between text-sm text-gray-700 font-medium border-t border-dashed border-gray-300 pt-2 mt-2">
                          <span>Total Tax:</span>
                          <span>₹{invoice.gstAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  {/* Rounding adjustment if needed */}
                </div>

                <div className="bg-gray-50 p-4 rounded border border-gray-200 print:bg-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">
                      Grand Total:
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      ₹{invoice.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* GST Notice - Bottom */}
                {isIndianGSTInvoice && pricesIncludeTax && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded text-sm">
                    <strong>Note:</strong> All prices are inclusive of GST
                  </div>
                )}
                {isIndianGSTInvoice && !pricesIncludeTax && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded text-sm">
                    <strong>Note:</strong> GST will be added to the base price.
                    Final amount may not be a round figure.
                  </div>
                )}

                {/* Footer: QR Code (Left) and Signature (Right) */}
                <div className="mt-8 flex justify-between items-end">
                  {/* QR Code - Bottom Left */}
                  {verifyUrl && (
                    <div className="flex-shrink-0">
                      <QRCodeSVG value={verifyUrl} size={90} level="M" />
                    </div>
                  )}

                  {/* Signature - Bottom Right */}
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 mb-8">
                      {shop?.name}
                    </p>
                    <p className="text-xs text-gray-500 border-t border-gray-300 pt-1 inline-block">
                      Authorized Signatory
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Print Footer */}
          <div className="text-center mt-12 text-[10px] text-gray-400 print:block hidden">
            <p>
              {shop?.invoiceFooter || "This is a computer-generated invoice."}
            </p>
          </div>
        </div>
      </div>

      {/* Floating Print Button for Mobile/Tablet */}
      <button
        onClick={triggerPrint}
        className="print:hidden fixed bottom-8 right-8 lg:hidden w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-200 flex items-center justify-center z-40"
        title="Print Invoice"
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

      {/* Bottom Spacer */}
      <div className="print:hidden h-8"></div>

      <style jsx global>{`
        @media print {
          body {
            visibility: hidden;
          }
          #invoice-print-area {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }
          #invoice-print-area * {
            visibility: visible;
          }
          @page {
            size: auto;
            margin: 5mm;
          }
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
    </div>
  );
}
