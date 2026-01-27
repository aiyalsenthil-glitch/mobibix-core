import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RepairStockItemDto {
  @IsString()
  shopProductId: string;

  @IsInt()
  @Min(1)
  quantity: number;
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
