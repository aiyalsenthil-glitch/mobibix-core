import type { SalesInvoice } from "@/services/sales.api";
import type { Shop } from "@/services/shops.api";
import type { ShopProduct } from "@/services/products.api";
import type { PrintDocumentData, PrintLineItem, PrintTaxLine } from "../types";
import { numberToIndianWords } from "@/utils/numberToWords";

interface AdapterContext {
  invoice: SalesInvoice;
  shop: Shop;
  productsMap: Record<string, ShopProduct>; // Map ID -> Product for names
}

export function mapInvoiceToPrintData(ctx: AdapterContext): PrintDocumentData {
  const { invoice, shop, productsMap } = ctx;

  // 1. Logic Extraction
  const isB2B = !!invoice.customerGstin;
  const isInterState = shop.state && invoice.customerState && shop.state !== invoice.customerState;
  
  // Heuristic for "Prices Inclusive": if rate * qty ≈ lineTotal (within tolerance)
  // This should ideally be a flag on the invoice model itself in the future.
  const pricesIncludeTax = invoice.items?.some((item) => {
    const gross = (item.rate || 0) * (item.quantity || 0);
    const total = item.lineTotal || 0;
    return Math.abs(gross - total) < 1; 
  }) || false;

  // 2. Line Items Transformation
  const items: PrintLineItem[] = (invoice.items || []).map((item) => {
    const product = productsMap[item.shopProductId];
    const name = product?.name || "Unknown Item";
    const description = product?.sku ? `SKU: ${product.sku}` : undefined;
    
    // Taxable Value logic
    // If backend provides taxableValue use it, else calculate derived
    const taxableValue = item.taxableValue ?? ((item.lineTotal || 0) - (item.gstAmount || 0));

    return {
      id: (item as any).id || Math.random().toString(),
      name,
      description,
      hsn: item.hsnCode || product?.hsnCode || "-",
      qty: item.quantity,
      rate: item.rate, // This is the displayed rate (could be incl or excl depending on config)
      total: item.lineTotal || 0,
      taxableValue,
      taxAmount: item.gstAmount || 0,
      taxRate: item.gstRate || 0,
    };
  });

  // 3. Tax Breakdown
  const taxLines: PrintTaxLine[] = [];
  
  // If we have granular tax data (from backend or manually calculated)
  // Ideally backend should provide summary.taxLines. For now, we derive from total gst.
  if ((invoice.gstAmount || 0) > 0) {
    if (invoice.igst && invoice.igst > 0) {
      taxLines.push({ label: "IGST", amount: invoice.igst, rate: 18 }); // Approx rate if mixed
    } else {
        // Default to split if no IGST or specific breakdown
        const halfTax = (invoice.gstAmount || 0) / 2;
        taxLines.push({ label: "CGST", amount: invoice.cgst ?? halfTax });
        taxLines.push({ label: "SGST", amount: invoice.sgst ?? halfTax });
    }
  }

  // 4. Address Formatting
  const addressLines = [
    shop.addressLine1,
    shop.addressLine2,
    [shop.city, shop.state, shop.pincode].filter(Boolean).join(" - ")
  ].filter(Boolean) as string[];

  const contactInfo = [
    shop.phone ? `Phone: ${shop.phone}` : null,
    // shop.email ? `Email: ${shop.email}` : null // Shop interface doesn't have email yet
  ].filter(Boolean) as string[];

  // 5. Final Assembly
  return {
    id: invoice.id,
    type: "INVOICE",
    header: {
      title: shop.gstEnabled ? "Tax Invoice" : "Invoice",
      shopName: shop.name,
      tagline: shop.tagline,
      logoUrl: shop.logoUrl,
      addressLines,
      contactInfo,
      gstNumber: shop.gstNumber,
    },
    headerConfig: shop.headerConfig, // Pass through customs
    meta: {
      "Invoice No": invoice.invoiceNumber,
      "Date": new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric"
      }),
      "Financial Year": "2025-26", // TODO: Dynamic
      "Place of Supply": invoice.customerState,
      
      // Job Card Details
      ...(invoice.jobCard ? {
        "Job No": invoice.jobCard.jobNumber,
        "Device": `${invoice.jobCard.deviceBrand} ${invoice.jobCard.deviceModel}`,
        ...(invoice.jobCard.deviceSerial ? { "Serial/IMEI": invoice.jobCard.deviceSerial } : {}),
      } : {}),

      // Bank Details (Filtered in template if undefined)
      "Bank Name": shop.bankName,
      "A/c No": shop.accountNumber,
      "IFSC": shop.ifscCode,
      "Branch": shop.branchName,
    },
    customer: {
      name: invoice.customerName || "Walk-in Customer",
      phone: invoice.customerPhone,
      gstin: invoice.customerGstin,
      state: invoice.customerState,
    },
    items,
    totals: {
      subTotal: invoice.subTotal ?? invoice.totalAmount, // Fallback if subtotal missing
      taxLines,
      totalTax: invoice.gstAmount || 0,
      grandTotal: invoice.totalAmount,
      amountInWords: numberToIndianWords(invoice.totalAmount),
    },
    notes: [], // Optional general notes
    footer: {
      terms: shop.terms && shop.terms.length > 0 ? shop.terms : [
        "All disputes subject to local jurisdiction.",
        "Warranty void if label is tampered with.",
        "Goods once sold will not be taken back."
      ],
      authorizedSignatory: true,
      text: shop.invoiceFooter
    },
    qrCode: `/verify/${invoice.id}`,
    config: {
      printDate: new Date().toISOString(),
      pricesInclusive: pricesIncludeTax,
      isB2B,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Extending config for UI
      isIndianGSTInvoice: !!shop.gstEnabled || !!shop.gstNumber, 
    },
  };
}
