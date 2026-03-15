import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsPositive,
  IsDate,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

enum InstallmentType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export class CreateLedgerAccountDto {
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  principalAmount: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  expectedTotal?: number;

  @IsNotEmpty()
  @IsEnum(InstallmentType)
  installmentType: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  installmentAmount: number;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  totalPeriods: number;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;
}
