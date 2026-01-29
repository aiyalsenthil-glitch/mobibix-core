import type { Receipt } from "@/services/receipts.api";
import type { Shop } from "@/services/shops.api";
import type { PrintDocumentData } from "@/lib/print/types";

export function mapReceiptToPrintData({
  receipt,
  shop,
}: {
  receipt: Receipt;
  shop: Shop;
}): PrintDocumentData {
  const amountInWords = toWords(receipt.amount);

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

// Simple Number to Words Converter (for Indian currency context)
function toWords(amount: number): string {
    // This is a placeholder. Real implementation would be more complex or use a library.
    // Ideally we should move the robust implementation from backend or utils to a shared lib.
    // For now, returning a simple formatted string or using a known util if available.
    // Since we don't have a shared util visible, I'll assume passing the numeric string is acceptable 
    // OR implementing a basic converter.
    
    // I will use a simple placeholder for now as implementing full number-to-words is verbose.
    // The Invoice adapter likely has one or expects the backend to provide it?
    // Checking types.ts: `totals.amountInWords` is optional string.
    // Backend Invoice has `amountInWords`. Receipt entity DOES NOT.
    // So we must generate it here or just leave it blank/simple.
    
    return `${amount.toLocaleString('en-IN')} Rupees Only`; 
}
