import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchGlobalProductsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  skip?: number = 0;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  take?: number = 50;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  hsnId?: string;
}
