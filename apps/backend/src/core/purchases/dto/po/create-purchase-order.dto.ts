import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderItemDto {
  @IsOptional()
  @IsString()
  globalProductId?: string;

  @IsString()
  description: string;

  @IsInt()
  quantity: number;

  @IsOptional()
  @IsInt()
  estimatedPrice?: number;

  @IsOptional()
  @IsString()
  uom?: string;
}

export class CreatePurchaseOrderDto {
  @IsString()
  shopId: string;

  @IsString()
  poNumber: string;

  @IsOptional()
  @IsString()
  globalSupplierId?: string;

  @IsString()
  supplierName: string;

  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @IsOptional()
  @IsDateString()
  expectedDelivery?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsOptional()
  @IsInt()
  paymentDueDays?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}
