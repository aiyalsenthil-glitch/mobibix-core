import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsPositive,
  IsDateString,
} from 'class-validator';
import { PaymentMode } from '@prisma/client';

export class CreateExpenseDto {
  @IsString()
  shopId: string;

  @IsInt()
  @IsPositive()
  amount: number; // Rupees — converted to Paisa in service

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  category?: string; // name of category (legacy)

  @IsEnum(PaymentMode)
  paymentMethod: PaymentMode;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  date?: string; // defaults to today
}
