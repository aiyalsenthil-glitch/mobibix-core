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

  @IsString()
  pincode: string;

  @IsString()
  invoicePrefix: string;

  @IsOptional()
  gstNumber?: string;

  @IsOptional()
  website?: string;

  @IsOptional()
  logoUrl?: string;

  @IsOptional()
  invoiceFooter?: string;
}
