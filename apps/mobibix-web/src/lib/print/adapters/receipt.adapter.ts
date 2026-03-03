import type { Receipt } from "@/services/receipts.api";
import type { Shop } from "@/services/shops.api";
import type { PrintDocumentData } from "@/lib/print/types";
import { numberToIndianWords } from "@/utils/numberToWords";

export function mapReceiptToPrintData({
  receipt,
  shop,
}: {
  receipt: Receipt;
  shop: Shop;
}): PrintDocumentData {
  const amountInWords = numberToIndianWords(receipt.amount);

  return {
    id: receipt.receiptId,
    type: "RECEIPT",
    header: {
      title: "PAYMENT RECEIPT",
      shopName: shop.name,
      tagline: shop.tagline,
      logoUrl: shop.logoUrl || undefined,
      addressLines: [
        shop.addressLine1,
        shop.addressLine2 || "",
        `${shop.city}, ${shop.state} - ${shop.pincode}`,
      ].filter((s): s is string => !!s),
      contactInfo: [`Phone: ${shop.phone}`, shop.website ? `Web: ${shop.website}` : ""].filter((s): s is string => !!s),
      gstNumber: shop.gstNumber || undefined,
    },
    meta: {
      "Receipt No": receipt.receiptId,
      "Date": new Date(receipt.createdAt).toLocaleDateString("en-IN"),
      "Payment Mode": receipt.paymentMethod,
      "Reference": receipt.transactionRef,
      "Narration": receipt.narration,
    },
    customer: {
      name: receipt.customerName,
      phone: receipt.customerPhone,
    },
    totals: {
      subTotal: receipt.amount,
      grandTotal: receipt.amount,
      amountInWords: amountInWords,
    },
    config: {
      printDate: new Date().toISOString(),
      pricesInclusive: true, // Not really relevant for receipt but required
      isB2B: false,
    },
    footer: {
      text: shop.invoiceFooter || "Thank you for your business!",
      authorizedSignatory: true,
    },
  };
}


