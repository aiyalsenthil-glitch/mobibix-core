import type { Quotation } from "@/services/quotations.api";
import type { Shop } from "@/services/shops.api";
import type { PrintDocumentData, PrintLineItem, PrintTaxLine } from "../types";
import { numberToIndianWords } from "@/utils/numberToWords";

interface AdapterContext {
  quotation: Quotation;
  shop: Shop;
}

export function mapQuotationToPrintData(ctx: AdapterContext): PrintDocumentData {
  const { quotation, shop } = ctx;

  // 1. Logic Extraction
  const pricesIncludeTax = false; // Quotations typically show raw prices

  // 2. Line Items Transformation
  const items: PrintLineItem[] = (quotation.items || []).map((item) => {
    return {
      id: item.id || Math.random().toString(),
      name: item.description,
      hsn: item.product?.hsnCode || "-",
      qty: item.quantity,
      rate: item.price,
      total: item.totalAmount,
      taxableValue: item.lineTotal,
      taxAmount: item.gstAmount,
      taxRate: item.gstRate,
    };
  });

  // 3. Tax Breakdown (Simplified for Quotation)
  const taxLines: PrintTaxLine[] = [];
  if (quotation.gstAmount > 0) {
    taxLines.push({ label: "GST", amount: quotation.gstAmount });
  }

  // 4. Address Formatting
  const addressLines = [
    shop.addressLine1,
    shop.addressLine2,
    [shop.city, shop.state, shop.pincode].filter(Boolean).join(" - "),
  ].filter(Boolean) as string[];

  const contactInfo = [
    shop.phone ? `Phone: ${shop.phone}` : null,
    shop.email ? `Email: ${shop.email}` : null,
  ].filter(Boolean) as string[];

  // 5. Final Assembly
  return {
    id: quotation.id,
    type: "QUOTATION",
    header: {
      title: "Quotation / Estimate",
      shopName: shop.name,
      tagline: shop.tagline,
      logoUrl: shop.logoUrl,
      addressLines,
      contactInfo,
      gstNumber: shop.gstNumber,
    },
    meta: {
      "Quotation No": quotation.quotationNumber,
      Date: new Date(quotation.quotationDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      Validity: `${quotation.validityDays} Days`,
      Status: quotation.status,
    },
    customer: {
      name: quotation.customerName,
      phone: quotation.customerPhone,
    },
    items,
    totals: {
      subTotal: quotation.subTotal,
      taxLines,
      totalTax: quotation.gstAmount,
      grandTotal: quotation.totalAmount,
      amountInWords: numberToIndianWords(quotation.totalAmount),
    },
    footer: {
      terms: shop.terms || [
        "Quotation is valid for mentioned days only.",
        "Prices are subject to change based on stock availability.",
      ],
      authorizedSignatory: true,
    },
    config: {
      printDate: new Date().toISOString(),
      pricesInclusive: pricesIncludeTax,
      isB2B: false,
      isIndianGSTInvoice: !!shop.gstEnabled,
    },
  };
}
