import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';

export enum LinkSource {
  GLOBAL = 'GLOBAL',
}

export class ShopProductLinkDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsEnum(LinkSource)
  source!: LinkSource; // Only GLOBAL supported (TenantProduct removed)

  @IsString()
  @IsNotEmpty()
  productId!: string; // globalProductId from GlobalProduct

  @IsNumber()
  @IsOptional()
  salePrice?: number;

  @IsNumber()
  @IsOptional()
  costPrice?: number;
}
