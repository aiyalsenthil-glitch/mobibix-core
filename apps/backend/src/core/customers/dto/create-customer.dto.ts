import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  IsEmail,
} from 'class-validator';
import { BusinessType, PartyType } from '@prisma/client';

export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  countryCode?: string; // ISO-3166-1 alpha-2 (e.g., IN, AE)

  @IsOptional()
  @IsString()
  isoStateCode?: string; // ISO-3166-2 state code (e.g., TN)

  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsEnum(BusinessType)
  businessType: BusinessType;

  @IsEnum(PartyType)
  partyType: PartyType;
}
