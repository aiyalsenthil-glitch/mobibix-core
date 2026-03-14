import { IsString, IsOptional, IsDateString } from 'class-validator';

export class InventoryIntelligenceQueryDto {
  @IsString()
  shopId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
