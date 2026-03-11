import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum CreditNoteType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
}

export enum CreditNoteReason {
  SALES_RETURN = 'SALES_RETURN',
  PURCHASE_RETURN = 'PURCHASE_RETURN',
  PRICE_ADJUSTMENT = 'PRICE_ADJUSTMENT',
  DISCOUNT_POST_SALE = 'DISCOUNT_POST_SALE',
  OVERBILLING = 'OVERBILLING',
  WARRANTY_CLAIM = 'WARRANTY_CLAIM',
}

export class CreateCreditNoteItemDto {
  @IsString()
  @IsOptional()
  shopProductId?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  rate: number;

  @IsString()
  @IsOptional()
  hsnCode?: string;

  @IsNumber()
  @IsOptional()
  gstRate?: number;

  @IsBoolean()
  @IsOptional()
  restockItem?: boolean;
}

export class CreateCreditNoteDto {
  @IsEnum(CreditNoteType)
  @IsNotEmpty()
  type: CreditNoteType;

  @IsEnum(CreditNoteReason)
  @IsNotEmpty()
  reason: CreditNoteReason;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  linkedInvoiceId?: string;

  @IsString()
  @IsOptional()
  linkedPurchaseId?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCreditNoteItemDto)
  items: CreateCreditNoteItemDto[];
}
