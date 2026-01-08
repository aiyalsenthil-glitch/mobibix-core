import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsIn,
} from 'class-validator';
import { Gender, FitnessGoal } from '@prisma/client';
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

  @Type(() => Number)
  @IsNumber()
  feeAmount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  paidAmount?: number;

  // -------------------------
  // Subscription Duration
  // -------------------------
  @IsString()
  @IsNotEmpty()
  @IsIn(['D30', 'D60', 'D90', 'M6', 'Y1'])
  durationCode: 'D30' | 'D60' | 'D90' | 'M6' | 'Y1';

  // -------------------------
  // Fitness (REQUIRED)
  // -------------------------

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(300)
  weightKg?: number;
  @IsEnum(FitnessGoal)
  fitnessGoal: FitnessGoal;
}
