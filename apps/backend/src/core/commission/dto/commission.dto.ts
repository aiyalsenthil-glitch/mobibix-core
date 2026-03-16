import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { CommissionScope, CommissionType, EarningStatus, UserRole } from '@prisma/client';

export class CreateCommissionRuleDto {
  @IsString()
  shopId: string;

  @IsString()
  name: string;

  @IsEnum(CommissionScope)
  @IsOptional()
  applyTo?: CommissionScope;

  @IsString()
  @IsOptional()
  staffId?: string;

  @IsEnum(UserRole)
  @IsOptional()
  staffRole?: UserRole;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(CommissionType)
  type: CommissionType;

  @IsNumber()
  @Min(0)
  @Max(100)
  value: number;
}

export class MarkPaidDto {
  @IsArray()
  @IsString({ each: true })
  earningIds: string[];
}
