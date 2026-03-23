import { IsString, IsDecimal, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum DistCreditEntryType {
  CREDIT = 'CREDIT', // Distributor gave credit to retailer
  PAYMENT = 'PAYMENT', // Retailer paid back
  ADJUSTMENT = 'ADJUSTMENT', // Correction
}

export class CreateCreditEntryDto {
  @IsString()
  retailerId: string;

  @IsEnum(DistCreditEntryType)
  entryType: DistCreditEntryType;

  @IsString()
  amount: string; // Decimal as string

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  referenceType?: string; // e.g., 'ORDER', 'UPR_PAYMENT'

  @IsOptional()
  @IsString()
  referenceId?: string;
  
  @IsOptional()
  @IsDateString()
  entryDate?: string;
}
