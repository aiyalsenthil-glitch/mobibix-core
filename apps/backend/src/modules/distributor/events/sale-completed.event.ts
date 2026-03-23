/**
 * Emitted by the Invoice/Sales module whenever a sale is finalized.
 * This is the main trigger for Distributor Sales Attribution.
 */
export class SaleCompletedEvent {
  /** The retailer's tenant ID */
  tenantId: string;

  /** The Invoice ID (opaque reference for traceability) */
  invoiceId: string;

  /** Individual items sold in this invoice */
  items: Array<{
    invoiceItemId: string;
    shopProductId: string;
    quantity: number;
    lineTotal: number; // in paise/cents
    invoiceDate: Date;
  }>;
}
