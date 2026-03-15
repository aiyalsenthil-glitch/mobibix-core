import type { PaymentVoucher as Voucher } from "@/services/vouchers.api";
import type { Shop } from "@/services/shops.api";
import type { PrintDocumentData } from "@/lib/print/types";
import { numberToIndianWords } from "@/utils/numberToWords";

export function mapVoucherToPrintData({
  voucher,
  shop,
}: {
  voucher: Voucher;
  shop: Shop;
}): PrintDocumentData {
  return {
    id: voucher.voucherId,
    type: "VOUCHER",
    header: {
      title: "PAYMENT VOUCHER",
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
      "Voucher No": voucher.voucherId,
      "Date": new Date(voucher.date).toLocaleDateString("en-IN"),
      "Type": voucher.voucherType,
      "Payment Mode": voucher.paymentMethod,
      "Reference": voucher.transactionRef,
      "Paid To": getPaidTo(voucher),
      "Narration": voucher.narration,
    },
    customer: {
      name: "N/A", // Vouchers might not have a "customer" in the sales sense
    },
    totals: {
      subTotal: voucher.amount,
      grandTotal: voucher.amount,
      amountInWords: numberToIndianWords(voucher.amount),
    },
    config: {
      printDate: new Date().toISOString(),
      pricesInclusive: true, 
      isB2B: false,
    },
    footer: {
      text: shop.invoiceFooter,
      authorizedSignatory: true,
    },
  };
}

function getPaidTo(voucher: Voucher): string {
    if (voucher.globalSupplierId) return "Supplier"; // Ideally fetch supplier name
    if (voucher.expenseCategory) return voucher.expenseCategory;
    return "Bearer";
}
