import { IsString, IsOptional, IsDecimal, IsInt, IsBoolean, IsArray, IsJSON } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCatalogItemDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  unitPrice: string; // Decimal as string

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  stockQuantity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  compatibility?: any;
}

export class UpdateCatalogItemDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  unitPrice?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  stockQuantity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  compatibility?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStockDto {
  @IsInt()
  @Type(() => Number)
  adjustment: number; // positive to add, negative to subtract
}
