import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMode {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  BANK = 'BANK',
}

export class PurchaseItemDto {
  @IsOptional()
  @IsString()
  shopProductId?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  hsnSac?: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  @Min(0)
  purchasePrice: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gstRate?: number;
}

export class CreatePurchaseDto {
  @IsString()
  shopId: string;

  @IsOptional()
  @IsString()
  globalSupplierId?: string;

  @IsString()
  supplierName: string;

  @IsString()
  invoiceNumber: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsEnum(PaymentMode)
  paymentMethod: PaymentMode;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}
