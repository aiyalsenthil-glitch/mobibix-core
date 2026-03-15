import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ModuleType } from '@prisma/client';

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @IsString()
  module: ModuleType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePlanStatusDto {
  @IsBoolean()
  isActive: boolean;
}
