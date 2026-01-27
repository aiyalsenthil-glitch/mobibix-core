import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';

export enum LinkSource {
  GLOBAL = 'GLOBAL',
  TENANT = 'TENANT',
}

export class ShopProductLinkDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsEnum(LinkSource)
  source!: LinkSource; // GLOBAL or TENANT

  @IsString()
  @IsNotEmpty()
  productId!: string; // globalProductId or tenantProductId

  @IsNumber()
  @IsOptional()
  salePrice?: number;

  @IsNumber()
  @IsOptional()
  costPrice?: number;
}
