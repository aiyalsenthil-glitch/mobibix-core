import {
  IsNotEmpty, IsString, IsInt, IsPositive,
  IsDate, IsEnum, IsOptional, Min, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

enum InstallmentType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

enum InterestRateType {
  RUPEES = 'RUPEES',
  PERCENTAGE = 'PERCENTAGE',
  PER_100 = 'PER_100',
  UPFRONT_DEDUCTION = 'UPFRONT_DEDUCTION',
}

export class CreateLedgerAccountDto {
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  principalAmount: number;

  @IsNotEmpty()
  @IsEnum(InstallmentType)
  installmentType: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  interestRate: number;

  @IsOptional()
  @IsEnum(InterestRateType)
  interestRateType?: 'RUPEES' | 'PERCENTAGE' | 'PER_100' | 'UPFRONT_DEDUCTION';

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  totalPeriods: number;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  // Indian Customizations
  @IsOptional()
  @IsBoolean()
  skipSundays?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  processingFee?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @IsOptional()
  @IsEnum(['NONE', 'FIXED', 'DAILY_RUPEES', 'DAILY_PERCENTAGE'])
  penaltyType?: 'NONE' | 'FIXED' | 'DAILY_RUPEES' | 'DAILY_PERCENTAGE';

  @IsOptional()
  @IsInt()
  @Min(0)
  penaltyValue?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  agentCommissionRate?: number;

  @IsOptional()
  @IsString()
  guarantorName?: string;

  @IsOptional()
  @IsString()
  guarantorPhone?: string;

  @IsOptional()
  @IsString()
  guarantorAddress?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;
}
