// update-member.dto.ts
import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsDateString,
} from 'class-validator';
import { Gender, FitnessGoal, MemberPaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  membershipStartAt?: string;

  @IsOptional()
  @IsDateString()
  membershipEndAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  feeAmount?: number;

  @IsOptional()
  @IsEnum(MemberPaymentStatus)
  paymentStatus?: MemberPaymentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  heightCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsEnum(FitnessGoal)
  fitnessGoal?: FitnessGoal;
}
