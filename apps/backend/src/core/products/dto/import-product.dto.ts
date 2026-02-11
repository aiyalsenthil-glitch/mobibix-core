import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Product type enumeration
 * Matches Prisma ProductType enum
 */
export enum ProductType {
  GOODS = 'GOODS',
  SERVICE = 'SERVICE',
}

/**
 * DTO for a single product import
 */
export class ImportProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsEnum(ProductType)
  type: ProductType;

  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingStock?: number;
}

/**
 * DTO for bulk product import
 * Used when importing from CSV/Excel
 */
export class BulkImportDto {
  @IsString()
  shopId: string;

  @ValidateNested({ each: true })
  @Type(() => ImportProductDto)
  products: ImportProductDto[];

  @IsOptional()
  @IsBoolean()
  includeStock?: boolean;
}

/**
 * Response DTO for import operation
 */
export interface ImportResultDto {
  success: number;
  failed: number;
  errors: string[];
  duplicates?: string[];
}
