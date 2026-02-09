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
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number',
  })
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

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
