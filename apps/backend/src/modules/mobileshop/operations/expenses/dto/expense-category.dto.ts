import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateExpenseCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
