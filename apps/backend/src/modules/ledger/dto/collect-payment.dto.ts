import { IsNotEmpty, IsString, IsInt, IsPositive, IsEnum, IsOptional } from 'class-validator';

enum PaymentMethod { CASH = 'CASH', UPI = 'UPI', BANK = 'BANK' }
enum PaymentType { FULL = 'FULL', PARTIAL = 'PARTIAL', INTEREST_ONLY = 'INTEREST_ONLY', CUSTOM = 'CUSTOM' }

export class CollectPaymentDto {
  @IsNotEmpty()
  @IsString()
  ledgerId: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: 'CASH' | 'UPI' | 'BANK';

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: 'FULL' | 'PARTIAL' | 'INTEREST_ONLY' | 'CUSTOM';

  @IsOptional()
  @IsString()
  note?: string;
}
