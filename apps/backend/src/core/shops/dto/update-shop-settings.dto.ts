import {
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
} from 'class-validator';
import { RepairInvoiceNumberingMode } from '@prisma/client';

export class UpdateShopSettingsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  website?: string;

  // GST
  @IsOptional()
  @IsBoolean()
  gstEnabled?: boolean;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  // Invoice / Print
  @IsOptional()
  @IsString()
  invoiceFooter?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  terms?: string[];

  @IsOptional()
  @IsString()
  logoUrl?: string;

  // Print Configuration
  @IsOptional()
  @IsString()
  invoicePrinterType?: "NORMAL" | "THERMAL";

  @IsOptional()
  @IsString()
  invoiceTemplate?: "CLASSIC" | "MODERN" | "CORPORATE" | "COMPACT" | "THERMAL";

  @IsOptional()
  @IsString()
  jobCardPrinterType?: "THERMAL";

  @IsOptional()
  @IsString()
  jobCardTemplate?: "SIMPLE" | "DETAILED" | "THERMAL";

  @IsOptional()
  headerConfig?: any; // Using any for Json, could be specific DTO

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  // Bank Details
  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  // Repair Module
  @IsOptional()
  @IsEnum(RepairInvoiceNumberingMode)
  repairInvoiceNumberingMode?: RepairInvoiceNumberingMode;

  @IsOptional()
  @IsBoolean()
  repairGstDefault?: boolean;
}
