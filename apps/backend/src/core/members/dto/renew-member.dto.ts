import { MemberPaymentStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RenewMemberDto {
  @IsInt()
  @Min(1)
  feeAmount: number;

  @IsEnum(MemberPaymentStatus)
  paymentStatus: MemberPaymentStatus;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
