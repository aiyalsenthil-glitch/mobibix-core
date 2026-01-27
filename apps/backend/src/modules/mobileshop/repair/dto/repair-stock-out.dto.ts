import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RepairStockItemDto {
  @IsString()
  shopProductId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  costPerUnit?: number; // Cost of part for COGS calculation
}

export class RepairStockOutDto {
  @IsString()
  shopId: string;

  @IsString()
  jobCardId: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  items: RepairStockItemDto[];
}
