import { IsOptional, IsString, IsInt } from 'class-validator';

export class SearchGlobalSuppliersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  skip?: number;

  @IsOptional()
  @IsInt()
  take?: number;
}
