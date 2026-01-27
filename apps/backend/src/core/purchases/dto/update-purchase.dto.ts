import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';

export enum PurchaseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMode {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  BANK = 'BANK',
}

export class UpdatePurchaseDto {
  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(PurchaseStatus)
  status?: PurchaseStatus;

  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMethod?: PaymentMode;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  cashAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  upiAmount?: number;

  @IsOptional()
  @IsString()
  purchaseType?: string;

  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
