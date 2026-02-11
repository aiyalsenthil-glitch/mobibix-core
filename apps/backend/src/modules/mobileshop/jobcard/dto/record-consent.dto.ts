import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RecordConsentDto {
  @IsBoolean()
  @IsNotEmpty()
  consentNonRefundable: boolean;

  @IsOptional()
  @IsString()
  consentSignatureUrl?: string;
}
