import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum DistOrderStatusUpdate {
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class OrderStatusUpdateDto {
  @IsEnum(DistOrderStatusUpdate)
  status: DistOrderStatusUpdate;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReceiveOrderItemDto {
  @IsString()
  orderItemId: string;

  @IsString()
  retailerProductId: string; // ERP product ID to create mapping
}

export class ReceiveOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveOrderItemDto)
  items: ReceiveOrderItemDto[];
}
