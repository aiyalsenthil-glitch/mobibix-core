import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsNumber,
} from 'class-validator';

export enum ProductType {
  MOBILE = 'MOBILE',
  ACCESSORY = 'ACCESSORY',
  SPARE = 'SPARE',
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ProductType)
  type: ProductType;

  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  imeis?: string[]; // Only for MOBILE
}
