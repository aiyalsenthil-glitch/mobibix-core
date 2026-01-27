import {
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

export class UpdateShopSettingsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  website?: string;

  // GST
  @IsOptional()
  @IsBoolean()
  gstEnabled?: boolean;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  // Invoice / Print
  @IsOptional()
  @IsString()
  invoiceFooter?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  terms?: string[];

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
