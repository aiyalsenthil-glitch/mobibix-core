import { IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { JobStatus, PaymentMode } from '@prisma/client';
import { Type } from 'class-transformer';

class RefundDetailsDto {
  @IsNumber()
  amount: number;

  @IsEnum(PaymentMode)
  mode: PaymentMode;
}

export class UpdateJobStatusDto {
  @IsEnum(JobStatus)
  status: JobStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RefundDetailsDto)
  refundDetails?: RefundDetailsDto;
}
