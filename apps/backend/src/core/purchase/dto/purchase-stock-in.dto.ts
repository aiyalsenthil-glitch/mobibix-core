import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ArrayNotEmpty,
} from 'class-validator';

export class PurchaseStockItemDto {
  @IsString()
  shopProductId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsInt()
  costPrice?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  imeis?: string[]; // For MOBILE; length must match quantity
}

export class PurchaseStockInDto {
  @IsString()
  shopId: string;

  @IsOptional()
  @IsString()
  purchaseRef?: string; // bill no / manual ref

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  items: PurchaseStockItemDto[];
}
