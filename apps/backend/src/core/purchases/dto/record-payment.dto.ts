import { IsInt, IsEnum, IsOptional, IsString, Min } from 'class-validator';

export enum PaymentMode {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  BANK = 'BANK',
}

export class RecordPaymentDto {
  @IsInt()
  @Min(1)
  amount: number;

  @IsEnum(PaymentMode)
  paymentMethod: PaymentMode;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
