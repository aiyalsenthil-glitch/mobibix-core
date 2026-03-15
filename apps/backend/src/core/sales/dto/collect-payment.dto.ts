import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMode } from '@prisma/client';

export class PaymentMethodDto {
  @IsEnum(PaymentMode)
  mode: PaymentMode;

  @IsNumber()
  @Min(1)
  amount: number;
}

export class CollectPaymentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDto)
  paymentMethods: PaymentMethodDto[];

  @IsOptional()
  @IsString()
  transactionRef?: string;

  @IsOptional()
  @IsString()
  narration?: string;
}
