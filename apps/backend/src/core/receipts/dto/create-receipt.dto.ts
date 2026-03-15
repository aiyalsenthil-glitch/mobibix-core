import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsPositive,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaymentMode, ReceiptType } from '@prisma/client';

export class CreateReceiptDto {
  @IsEnum(PaymentMode)
  paymentMethod: PaymentMode;

  @IsInt()
  @IsPositive()
  amount: number;

  @IsEnum(ReceiptType)
  receiptType: ReceiptType;

  @IsString()
  @MinLength(1)
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  linkedInvoiceId?: string;

  @IsOptional()
  @IsString()
  linkedJobId?: string;

  @IsOptional()
  @IsString()
  narration?: string;

  @IsOptional()
  @IsString()
  transactionRef?: string;
}
