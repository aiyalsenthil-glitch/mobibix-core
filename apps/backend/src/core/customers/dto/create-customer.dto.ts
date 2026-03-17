import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
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

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3000)
  distanceFromShop?: number;

  @IsEnum(BusinessType)
  businessType: BusinessType;

  @IsEnum(PartyType)
  partyType: PartyType;
}
