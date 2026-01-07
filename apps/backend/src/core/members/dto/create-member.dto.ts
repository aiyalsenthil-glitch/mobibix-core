import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { Gender, FitnessGoal, MemberPaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateMemberDto {
  // -------------------------
  // Identity
  // -------------------------
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsString()
  photoUrl?: string;
  // -------------------------
  // Membership
  // -------------------------
  @IsString()
  @IsNotEmpty()
  membershipPlanId: string;

  @IsDateString()
  membershipStartAt: string;

  @IsDateString()
  membershipEndAt: string;

  @Type(() => Number)
  @IsNumber()
  feeAmount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  paidAmount?: number;

  // -------------------------
  // Fitness (REQUIRED)
  // -------------------------
  @Type(() => Number)
  @IsNumber()
  heightCm: number;

  @Type(() => Number)
  @IsNumber()
  weightKg: number;

  @IsEnum(FitnessGoal)
  fitnessGoal: FitnessGoal;
}
