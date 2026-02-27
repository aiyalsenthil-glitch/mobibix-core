import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  Length,
  Matches,
} from 'class-validator';
import { PartnerType } from '@prisma/client';

export class CreatePartnerDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  contactPerson: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian phone number' })
  phone: string;

  @IsEnum(PartnerType)
  partnerType: PartnerType;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  region?: string;
}

export class ApplyPromoDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 20)
  code: string;
}

export class GeneratePromoDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 20)
  code: string;

  @IsString()
  @IsNotEmpty()
  type: string; // PromoCodeType

  @IsNotEmpty()
  durationDays: number;

  @IsOptional()
  maxUses?: number;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  expiresAt?: string; // ISO date string
}
