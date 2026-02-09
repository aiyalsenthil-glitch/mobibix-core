import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsPositive,
  MinLength,
} from 'class-validator';
import { PaymentMode, VoucherType, VoucherSubType } from '@prisma/client';

export class CreateVoucherDto {
  @IsEnum(PaymentMode)
  paymentMethod: PaymentMode;

  @IsInt()
  @IsPositive()
  amount: number;

  @IsEnum(VoucherType)
  voucherType: VoucherType;

  @IsOptional()
  @IsEnum(VoucherSubType)
  voucherSubType?: VoucherSubType;

  @IsOptional()
  @IsString()
  globalSupplierId?: string;

  @IsOptional()
  @IsString()
  expenseCategory?: string; // rent, eb, tea, donation, misc, etc.

  @IsOptional()
  @IsString()
  linkedPurchaseId?: string;

  @IsOptional()
  @IsString()
  narration?: string;

  @IsOptional()
  @IsString()
  transactionRef?: string;
}
