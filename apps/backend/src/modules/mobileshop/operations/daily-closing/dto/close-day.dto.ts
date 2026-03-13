import {
  IsString,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class CloseDayDto {
  @IsString()
  shopId: string;

  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsInt()
  @Min(0)
  physicalCashCounted: number; // Rupees — converted to Paisa in service

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReopenDayDto {
  @IsString()
  shopId: string;

  @IsDateString()
  date: string;

  @IsString()
  reason: string; // "missed expense" | "wrong cash count" | custom text
}

export class ApproveCashVarianceDto {
  @IsString()
  varianceId: string;

  @IsString()
  shopId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
