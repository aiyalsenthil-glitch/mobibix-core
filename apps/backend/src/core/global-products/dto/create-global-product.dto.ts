import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateGlobalProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  hsnId: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
