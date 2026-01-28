import { IsInt, IsOptional, IsString, NotEquals } from 'class-validator';

export class StockCorrectionDto {
  @IsString()
  shopId: string;

  @IsString()
  shopProductId: string;

  @IsInt()
  @NotEquals(0)
  quantity: number; // positive or negative

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  note?: string;
}
