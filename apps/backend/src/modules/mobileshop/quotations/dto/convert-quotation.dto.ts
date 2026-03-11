import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum QuotationConversionType {
  INVOICE = 'INVOICE',
  JOB_CARD = 'JOB_CARD',
}

export class ConvertQuotationDto {
  @IsEnum(QuotationConversionType)
  @IsNotEmpty()
  conversionType: QuotationConversionType;

  // Required/Optional when conversionType = JOB_CARD
  @IsString()
  @IsOptional()
  deviceType?: string;

  @IsString()
  @IsOptional()
  deviceBrand?: string;

  @IsString()
  @IsOptional()
  deviceModel?: string;

  @IsString()
  @IsOptional()
  customerComplaint?: string;
}
