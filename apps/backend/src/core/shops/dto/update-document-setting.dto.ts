import {
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsOptional,
  Length,
} from 'class-validator';

export enum DocumentType {
  SALES_INVOICE = 'SALES_INVOICE',
  PURCHASE_INVOICE = 'PURCHASE_INVOICE',
  JOB_CARD = 'JOB_CARD',
  RECEIPT = 'RECEIPT',
  QUOTATION = 'QUOTATION',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  PAYMENT_VOUCHER = 'PAYMENT_VOUCHER',
  REPAIR_INVOICE = 'REPAIR_INVOICE',
}

export enum YearFormat {
  FY = 'FY', // 2526 (Financial Year: April 2025 - March 2026)
  YYYY = 'YYYY', // 20252026 (Full 4-digit years)
  YY = 'YY', // 26 (Ending year only, 2-digit)
  NONE = 'NONE', // No year in number
}

export enum ResetPolicy {
  YEARLY = 'YEARLY', // Reset every financial year
  MONTHLY = 'MONTHLY', // Reset every month
  NEVER = 'NEVER', // Never reset
}

/**
 * DTO for updating a ShopDocumentSetting record
 * Used in PUT /shops/:shopId/document-settings/:documentType
 */
export class UpdateDocumentSettingDto {
  @IsOptional()
  @IsString()
  @Length(1, 10)
  prefix?: string;

  @IsOptional()
  @IsString()
  @Length(1, 3)
  separator?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5)
  documentCode?: string;

  @IsOptional()
  @IsEnum(YearFormat)
  yearFormat?: YearFormat;


  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(8)
  numberLength?: number;

  @IsOptional()
  @IsEnum(ResetPolicy)
  resetPolicy?: ResetPolicy;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentNumber?: number;

  @IsOptional()
  @IsString()
  currentYear?: string;
}
