import { authenticatedFetch } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export interface Shop {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  website?: string;
  gstNumber?: string;
  gstEnabled?: boolean;
  invoicePrefix?: string;
  invoiceFooter?: string;
  logoUrl?: string;
  tagline?: string;
  terms?: string[];
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  currency?: string;

  // Print Settings
  invoicePrinterType?: "NORMAL" | "THERMAL";
  invoiceTemplate?: "CLASSIC" | "MODERN" | "CORPORATE" | "COMPACT" | "THERMAL";
  jobCardPrinterType?: "THERMAL";
  jobCardTemplate?: "SIMPLE" | "DETAILED" | "THERMAL";

  // Custom Header
  headerConfig?: {
    layout: "CLASSIC" | "CENTERED" | "SPLIT" | "MINIMAL";
    showLogo: boolean;
    showTagline: boolean;
    accentColor?: string;
  };
  // Bank Details
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  repairInvoiceNumberingMode?: RepairInvoiceNumberingMode;
  repairGstDefault?: boolean;
}

export interface CreateShopDto {
  name: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  invoicePrefix: string;
  gstNumber?: string;
  website?: string;
  logoUrl?: string;
  invoiceFooter?: string;

  // Default Print Settings
  invoicePrinterType?: "NORMAL" | "THERMAL";
  invoiceTemplate?: "CLASSIC" | "MODERN" | "THERMAL";
  currency?: string;
}

export interface UpdateShopDto {
  name?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  website?: string;
  logoUrl?: string;
  invoiceFooter?: string;
  terms?: string[];
  currency?: string;
}

export interface UpdateShopSettingsDto {
  name?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  website?: string;
  gstEnabled?: boolean;
  gstNumber?: string;
  invoiceFooter?: string;
  terms?: string[];
  logoUrl?: string;
  tagline?: string;

  // Print Settings Updates
  invoicePrinterType?: "NORMAL" | "THERMAL";
  invoiceTemplate?: "CLASSIC" | "MODERN" | "CORPORATE" | "COMPACT" | "THERMAL";
  currency?: string;
  jobCardPrinterType?: "THERMAL";
  jobCardTemplate?: "SIMPLE" | "DETAILED" | "THERMAL";

  headerConfig?: {
    layout: "CLASSIC" | "CENTERED" | "SPLIT" | "MINIMAL";
    showLogo: boolean;
    showTagline: boolean;
    accentColor?: string;
  };
  // Bank Details
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;

  repairInvoiceNumberingMode?: RepairInvoiceNumberingMode;
  repairGstDefault?: boolean;
}

/**
 * List all shops for the authenticated user's tenant
 */
export async function listShops(): Promise<Shop[]> {
  const response = await authenticatedFetch(`/mobileshop/shops`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch shops");
  }

  return response.json();
}

/**
 * Get a single shop by ID
 */
export async function getShop(shopId: string): Promise<Shop> {
  const response = await authenticatedFetch(`/mobileshop/shops/${shopId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch shop");
  }

  return response.json();
}

/**
 * Create a new shop
 */
export async function createShop(data: CreateShopDto): Promise<Shop> {
  const response = await authenticatedFetch(`/mobileshop/shops`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create shop");
  }

  return response.json();
}

/**
 * Update a shop
 */
export async function updateShop(
  shopId: string,
  data: UpdateShopDto,
): Promise<Shop> {
  const response = await authenticatedFetch(`/mobileshop/shops/${shopId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update shop");
  }

  return response.json();
}

/**
 * Get shop settings
 */
export async function getShopSettings(shopId: string): Promise<Shop> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/settings`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch shop settings");
  }

  return response.json();
}

/**
 * Update shop settings
 */
export async function updateShopSettings(
  shopId: string,
  data: UpdateShopSettingsDto,
): Promise<Shop> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/settings`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update shop settings");
  }

  return response.json();
}

/**
 * Document Setting Types
 */
export enum DocumentType {
  SALES_INVOICE = "SALES_INVOICE",
  PURCHASE_INVOICE = "PURCHASE_INVOICE",
  JOB_CARD = "JOB_CARD",
  RECEIPT = "RECEIPT",
  QUOTATION = "QUOTATION",
  PURCHASE_ORDER = "PURCHASE_ORDER",
  REPAIR_INVOICE = "REPAIR_INVOICE",
}

export enum RepairInvoiceNumberingMode {
  SHARED = "SHARED",
  SEPARATE = "SEPARATE",
}

export enum YearFormat {
  FY = "FY",
  YYYY = "YYYY",
  YY = "YY",
  NONE = "NONE",
}

export enum ResetPolicy {
  YEARLY = "YEARLY",
  MONTHLY = "MONTHLY",
  NEVER = "NEVER",
}

export interface ShopDocumentSetting {
  id: string;
  shopId: string;
  documentType: DocumentType;
  prefix: string;
  separator: string;
  documentCode: string;
  yearFormat: YearFormat;
  numberLength: number;
  resetPolicy: ResetPolicy;
  currentNumber: number;
  currentYear?: string;
  lastGenerated?: string; // Virtual field if needed or constructed on client
}

export interface UpdateDocumentSettingDto {
  prefix?: string;
  separator?: string;
  documentCode?: string;
  yearFormat?: YearFormat;
  numberLength?: number;
  resetPolicy?: ResetPolicy;
  currentNumber?: number;
  currentYear?: string;
}

/**
 * Get all document settings for a shop
 */
export async function getShopDocumentSettings(
  shopId: string,
): Promise<ShopDocumentSetting[]> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/document-settings`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch document settings");
  }

  return response.json();
}

/**
 * Update a specific document setting
 */
export async function updateShopDocumentSetting(
  shopId: string,
  documentType: DocumentType,
  data: UpdateDocumentSettingDto,
): Promise<ShopDocumentSetting> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/document-settings/${documentType}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update document setting");
  }

  return response.json();
}
