import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class ManualEntriesDto {
  @IsNumber() @IsOptional() salesCash?: number;
  @IsNumber() @IsOptional() salesUpi?: number;
  @IsNumber() @IsOptional() salesCard?: number;
  @IsNumber() @IsOptional() salesBank?: number;
  @IsNumber() @IsOptional() otherCashIn?: number;
  @IsNumber() @IsOptional() cashWithdrawFromBank?: number;
  @IsNumber() @IsOptional() expenseCash?: number;
  @IsNumber() @IsOptional() supplierPaymentsCash?: number;
  @IsNumber() @IsOptional() otherCashOut?: number;
  @IsNumber() @IsOptional() cashDepositToBank?: number;
}

export class DailyCloseDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  mode: 'SYSTEM' | 'MANUAL';

  @IsNumber()
  reportedClosingCash: number;

  @IsOptional()
  manualEntries?: ManualEntriesDto;

  @IsOptional()
  denominations?: Record<string, number>;

  @IsString()
  @IsOptional()
  varianceReason?: string;

  @IsString()
  @IsOptional()
  varianceNote?: string;

  @IsString()
  @IsOptional()
  notes?: string; // Some versions might use 'notes' instead of varianceNote
}

export class ShiftOpenDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsString()
  @IsNotEmpty()
  shiftName: string;
}

export class ShiftCloseDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsNumber()
  reportedClosingCash: number;
}
