import { IsString, IsOptional, IsArray, IsEnum, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { DistPaymentType } from '@prisma/client';

export class PlaceOrderItemDto {
  @IsString()
  catalogItemId: string;

  @IsInt()
  @Type(() => Number)
  quantity: number;
}

export class PlaceOrderDto {
  @IsString()
  distributorId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceOrderItemDto)
  items: PlaceOrderItemDto[];

  @IsOptional()
  @IsEnum(DistPaymentType)
  paymentType?: DistPaymentType;

  @IsOptional()
  @IsString()
  notes?: string;
}
