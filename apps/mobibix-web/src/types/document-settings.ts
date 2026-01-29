// Document Numbering Types
// Maps to backend ShopDocumentSetting model

export type DocumentType =
  | "SALES_INVOICE"
  | "PURCHASE_INVOICE"
  | "JOB_CARD"
  | "RECEIPT"
  | "QUOTATION"
  | "PURCHASE_ORDER";

export type YearFormat = "FY" | "YYYY" | "YY" | "NONE";

export type ResetPolicy = "NEVER" | "YEARLY" | "MONTHLY";

export interface DocumentNumberSetting {
  id: string;
  shopId: string;
  documentType: DocumentType;

  // Format configuration
  prefix: string;
  separator: string;
  documentCode: string;
  yearFormat: YearFormat;
  numberLength: number; // 3-6
  resetPolicy: ResetPolicy;

  // Current state (for locking logic)
  currentNumber: number;
  currentYear: string | null;

  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDocumentSettingDto {
  separator?: string;
  yearFormat?: YearFormat;
  numberLength?: number;
  resetPolicy?: ResetPolicy;
  // Note: prefix, documentCode NOT editable once documents exist
}

// Display labels for UI
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  SALES_INVOICE: "Sales Invoice",
  PURCHASE_INVOICE: "Purchase Invoice",
  JOB_CARD: "Job Card",
  RECEIPT: "Receipt",
  QUOTATION: "Quotation",
  PURCHASE_ORDER: "Purchase Order",
};

export const YEAR_FORMAT_LABELS: Record<
  YearFormat,
  { label: string; example: string }
> = {
  FY: { label: "Financial Year (4-digit)", example: "2526" },
  YYYY: { label: "Full Year (8-digit)", example: "20252026" },
  YY: { label: "Short Year (2-digit)", example: "26" },
  NONE: { label: "No Year", example: "" },
};

export const RESET_POLICY_LABELS: Record<
  ResetPolicy,
  { label: string; description: string }
> = {
  YEARLY: {
    label: "Yearly",
    description: "Reset on April 1st (Financial Year)",
  },
  MONTHLY: { label: "Monthly", description: "Reset every month" },
  NEVER: { label: "Never", description: "Continuous numbering" },
};

export const SEPARATOR_OPTIONS = [
  { value: "-", label: "Hyphen (-)" },
  { value: "/", label: "Slash (/)" },
  { value: "_", label: "Underscore (_)" },
  { value: ".", label: "Dot (.)" },
];

export const NUMBER_LENGTH_OPTIONS = [3, 4, 5, 6];
