import {
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsNotEmpty,
  Min,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMode } from '@prisma/client';

/**
 * GST Billing Mode for repair services
 * WITH_GST: Invoice includes GST as per serviceGstRate
 * WITHOUT_GST: Invoice is GST-exempt (gstRate = 0)
 */
export enum BillingMode {
  WITH_GST = 'WITH_GST',
  WITHOUT_GST = 'WITHOUT_GST',
}

export class RepairServiceDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;

  // Optional: client can suggest, but backend validates against billingMode
  @IsNumber()
  @IsOptional()
  @Min(0)
  gstRate?: number;
}

export class RepairPartDto {
  @IsString()
  shopProductId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsNumber()
  @Min(0)
  gstRate: number;
}

export class RepairBillDto {
  @IsString()
  jobCardId: string;

  @IsString()
  shopId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RepairServiceDto)
  services: RepairServiceDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RepairPartDto)
  parts?: RepairPartDto[];

  @IsEnum(BillingMode)
  billingMode: BillingMode;

  @IsBoolean()
  @IsOptional()
  pricesIncludeTax?: boolean;

  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @IsNumber()
  @IsOptional()
  @Min(0)
  serviceGstRate?: number; // Default 18% if billingMode = WITH_GST

  @IsBoolean()
  @IsOptional()
  deliverImmediately?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  loyaltyPointsRedeemed?: number;
}
