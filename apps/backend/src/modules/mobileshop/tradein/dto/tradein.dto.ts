import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsObject,
} from 'class-validator';
import { TradeInGrade, TradeInStatus } from '@prisma/client';

export class CreateTradeInDto {
  @IsString()
  shopId: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsString()
  deviceBrand: string;

  @IsString()
  deviceModel: string;

  @IsString()
  @IsOptional()
  deviceImei?: string;

  @IsString()
  @IsOptional()
  deviceStorage?: string;

  @IsString()
  @IsOptional()
  deviceColor?: string;

  @IsObject()
  @IsOptional()
  conditionChecks?: Record<string, boolean>;

  @IsEnum(TradeInGrade)
  conditionGrade: TradeInGrade;

  @IsNumber()
  @Min(0)
  marketValue: number; // rupees

  @IsNumber()
  @Min(0)
  offeredValue: number; // rupees

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateTradeInStatusDto {
  @IsEnum(TradeInStatus)
  status: TradeInStatus;

  @IsString()
  @IsOptional()
  linkedInvoiceId?: string;
}
