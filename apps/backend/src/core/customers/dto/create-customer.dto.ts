import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BusinessType, PartyType } from '@prisma/client';

export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
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
