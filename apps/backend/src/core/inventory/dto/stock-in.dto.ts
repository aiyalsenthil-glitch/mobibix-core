import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  ArrayNotEmpty,
} from 'class-validator';
import { ProductType } from './create-product.dto';

export class StockInDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsEnum(ProductType)
  type: ProductType;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  imeis?: string[]; // For serialized products

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number; // For bulk products

  @IsOptional()
  @IsInt()
  @Min(0)
  costPerUnit?: number; // For COGS tracking
}
