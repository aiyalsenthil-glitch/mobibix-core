import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RenewMemberDto {
  @IsInt()
  @Min(1)
  feeAmount: number;

  // how much collected at renewal time
  @IsOptional()
  @IsInt()
  @Min(0)
  paidAmount?: number;

  // optional duration override (default = 30 days)
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  reason?: string;
  isFeeOverridden?: boolean;
}
