import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsPositive,
  IsEnum,
  IsOptional,
} from 'class-validator';

enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  BANK = 'BANK',
}

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
  @IsString()
  note?: string;
}
