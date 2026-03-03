import { IsString, IsOptional } from 'class-validator';

export class CreateShopDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  addressLine1: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsString()
  pincode: string;

  @IsString()
  invoicePrefix: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  invoiceFooter?: string;
}
