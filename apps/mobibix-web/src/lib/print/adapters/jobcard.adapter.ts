import type { JobCard } from "@/services/jobcard.api";
import type { Shop } from "@/services/shops.api";
import type { PrintDocumentData, PrintLineItem } from "../types";
import { formatCurrency } from "@/lib/gst.utils";

interface AdapterContext {
  jobCard: JobCard;
  shop: Shop;
}

export function mapJobCardToPrintData(ctx: AdapterContext): PrintDocumentData {
  const { jobCard, shop } = ctx;

  // 1. Format Address
  const addressLines = [
    shop.addressLine1,
    shop.addressLine2,
    [shop.city, shop.state, shop.pincode].filter(Boolean).join(" - ")
  ].filter(Boolean) as string[];

  const contactInfo = [
    shop.phone ? `Phone: ${shop.phone}` : null,
    // shop.email ? `Email: ${shop.email}` : null 
  ].filter(Boolean) as string[];

  // 2. Create Items from Device Details (Job Cards usually list the device as the "item")
  const items: PrintLineItem[] = [{
      id: "device-1",
      name: `${jobCard.deviceBrand} ${jobCard.deviceModel}`,
      description: [
          jobCard.deviceType,
          jobCard.deviceSerial ? `Serial/IMEI: ${jobCard.deviceSerial}` : null,
          jobCard.devicePassword ? `Password: ${jobCard.devicePassword}` : null,
          jobCard.physicalCondition ? `Condition: ${jobCard.physicalCondition}` : null
      ].filter(Boolean).join(" | "),
      qty: 1,
      rate: jobCard.estimatedCost || 0,
      total: jobCard.estimatedCost || 0,
  }];

  // Helper for safe dates
  const formatDate = (d: string | Date | undefined) => {
      if (!d) return "-";
      try {
          return new Date(d).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
          });
      } catch (e) {
          return "-";
      }
  };

  // 3. Status Mapping
  const formattedStatus = jobCard.status.replace(/_/g, " ");

  return {
    id: jobCard.id,
    type: "JOBCARD",
    header: {
      title: "Job Sheet / Receipt",
      shopName: shop.name,
      logoUrl: shop.logoUrl,
      addressLines,
      contactInfo,
      gstNumber: shop.gstNumber,
    },
    meta: {
      "Job No": jobCard.jobNumber,
      "Date": formatDate(jobCard.createdAt),
      "Status": formattedStatus,
      "Est. Delivery": jobCard.estimatedDelivery 
        ? formatDate(jobCard.estimatedDelivery).split(',')[0] // Just date for est delivery
        : "TBD",
      // Financials
      "Estimated Cost": jobCard.estimatedCost || 0,
      "Advance Paid": jobCard.advancePaid || 0,
      "Balance Due": (jobCard.estimatedCost || 0) - (jobCard.advancePaid || 0),
      // Device Details
      "Device Type": jobCard.deviceType,
      "Device Brand": jobCard.deviceBrand,
      "Device Model": jobCard.deviceModel,
      "Device Serial": jobCard.deviceSerial || "N/A",
      // Issue Details
      "Complaint": jobCard.customerComplaint,
      "Condition": jobCard.physicalCondition || "N/A"
    },
    customer: {
      name: jobCard.customerName,
      phone: jobCard.customerPhone,
      // address: jobCard.customerAddress // JobCard interface doesn't have address yet?
    },
    items,
    totals: {
      subTotal: jobCard.estimatedCost || 0,
      grandTotal: jobCard.estimatedCost || 0,
      // Job cards are estimates, usually no tax breakdown shown unless it's a bill
    },
    notes: [
        `Issue Reported: ${jobCard.customerComplaint}`,
        jobCard.advancePaid ? `Advance Paid: ${formatCurrency(jobCard.advancePaid)}` : null
    ].filter(Boolean) as string[],
    footer: {
      terms: shop.terms || [
          "Device received at owner's risk.",
          "We are not responsible for data loss.",
          "Goods not collected within 30 days will be disposed."
      ],
      authorizedSignatory: true,
      text: "Thanks for choosing us!"
    },
    qrCode: `/track/${jobCard.publicToken}`, // Tracking URL
    config: {
      printDate: new Date().toISOString(),
      pricesInclusive: true, // Estimates usually inclusive
      isB2B: false,
    },
  };
}
