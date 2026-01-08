import { IsInt, IsOptional, IsString, Min, IsIn } from 'class-validator';

export class RenewMemberDto {
  @IsInt()
  @Min(1)
  feeAmount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  paidAmount?: number;

  // ✅ SINGLE SOURCE OF TRUTH
  @IsIn(['D30', 'D60', 'D90', 'M6', 'Y1'])
  durationCode: 'D30' | 'D60' | 'D90' | 'M6' | 'Y1';

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  isFeeOverridden?: boolean;
}
