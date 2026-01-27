import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateTenantProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  hsnId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
