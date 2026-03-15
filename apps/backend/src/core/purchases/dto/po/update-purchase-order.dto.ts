import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { POStatus } from '@prisma/client';

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsDateString()
  expectedDelivery?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(POStatus)
  status?: POStatus;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsOptional()
  @IsInt()
  paymentDueDays?: number;
}
