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

export class RepairServiceDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  sacCode?: string; // Backend will override to '9987'

  @IsNumber()
  @Min(0)
  amount: number;
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

  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @IsBoolean()
  @IsOptional()
  pricesIncludeTax?: boolean;
}
