import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export enum ProductType {
  GOODS = 'GOODS',
  SPARE = 'SPARE',
  SERVICE = 'SERVICE',
}

export class CreateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shopId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isSerialized?: boolean; // For GOODS: true = track IMEI per unit, false = quantity-based

  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  imeis?: string[]; // Only for GOODS with isSerialized=true

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsNumber()
  gstRate?: number;
}
