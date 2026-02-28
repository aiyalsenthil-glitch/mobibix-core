export type DocumentType = "INVOICE" | "JOBCARD" | "RECEIPT" | "VOUCHER";
export type TemplateVariant = "CLASSIC" | "THERMAL" | "MODERN" | "SIMPLE" | "DETAILED" | "PROFESSIONAL";

// Header Customization Config
export interface HeaderConfig {
  layout: 'CLASSIC' | 'CENTERED' | 'SPLIT' | 'MINIMAL';
  showLogo: boolean;
  showTagline: boolean;
  accentColor?: string; // Hex
}

export interface PrintDocumentData {
  id: string; // Document ID (Invoice ID, JobCard ID)
  type: DocumentType;
  
  headerConfig?: HeaderConfig; // NEW: Custom header settings
  
  header: {
    title: string;
    shopName: string;
    tagline?: string;
    logoUrl?: string; // Full URL
    addressLines: string[]; // [Line 1, Line 2, City - State]
    contactInfo: string[]; // [Phone: 123, Email: abc@...]
    gstNumber?: string;
  };

  meta: Record<string, string | number | undefined>; 
  // e.g. { "Invoice No": "INV-001", "Date": "2024-01-01", "Status": "Paid" }

  customer: {
    name: string;
    phone?: string;
    address?: string; // Full address string or concatenated lines
    gstin?: string;
    state?: string; // For Place of Supply
  };

  items?: PrintLineItem[];

  // Optional totals block (Invoices have it, Job Cards might not)
  totals?: {
    subTotal: number; // Sum of taxable values or gross total before tax
    taxLines?: PrintTaxLine[]; // Dynamic tax breakdown
    totalTax?: number; 
    roundOff?: number;
    grandTotal: number;
    amountInWords?: string;
  };

  // Sections for free-text content
  notes?: string[]; 
  
  footer?: {
    terms?: string[];
    text?: string; // "Thank you for your business"
    authorizedSignatory?: boolean; // Show signature line?
  };

  qrCode?: string; // URL for QR generation

  config: {
    printDate: string;
    pricesInclusive: boolean; // Relevant for column headers
    isB2B: boolean;
    accentColor?: string;
    isIndianGSTInvoice?: boolean;
  };
}

export interface PrintLineItem {
  id: string;
  name: string;
  description?: string; // SKU, IMEI, etc.
  hsn?: string;
  qty: number;
  rate: number; // Unit Price
  unit?: string;
  
  // Tax details per line (already calculated)
  taxableValue?: number;
  taxAmount?: number;
  taxRate?: number; // GST %
  
  total: number; // Rate * Qty (+ Tax if exclusive)
}

export interface PrintTaxLine {
  label: string; // "CGST (9%)"
  amount: number;
  rate?: number; // 9
}
