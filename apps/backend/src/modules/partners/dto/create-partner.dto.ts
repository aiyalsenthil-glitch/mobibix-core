import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  Length,
  Matches,
  IsNumber,
  Min,
} from 'class-validator';
import { PartnerType, ModuleType } from '@prisma/client';

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
  type: string; // PromoCodeType: FREE_TRIAL | DISCOUNT | SUBSCRIPTION_BONUS

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationDays?: number; // For FREE_TRIAL: days of free access

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusMonths?: number; // For SUBSCRIPTION_BONUS: extra months on first paid plan

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string; // ISO date string

  @IsOptional()
  @IsEnum(ModuleType)
  module?: ModuleType; // GYM | MOBILE_SHOP — scopes which plan tier to apply
}
