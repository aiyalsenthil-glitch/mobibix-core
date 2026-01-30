import { IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum DateRangePreset {
  TODAY = 'TODAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  LAST_90_DAYS = 'LAST_90_DAYS',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  CUSTOM = 'CUSTOM',
}

export class DashboardQueryDto {
  @IsOptional()
  @IsEnum(DateRangePreset)
  preset?: DateRangePreset;

  @IsOptional()
  @IsDateString()
  startDate?: string; // ISO date string

  @IsOptional()
  @IsDateString()
  endDate?: string; // ISO date string

  @IsOptional()
  shopId?: string; // Optional shop filter
}
