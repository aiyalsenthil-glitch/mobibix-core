import {
  IsNotEmpty,
  IsEnum,
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ModuleType } from '@prisma/client';

export class CreateAutomationDto {
  @IsEnum(ModuleType)
  @IsNotEmpty()
  moduleType: ModuleType;

  @IsString()
  @IsNotEmpty()
  eventType: string; // GymEventType or MobileShopEventType as string

  @IsString()
  @IsNotEmpty()
  templateKey: string;

  @IsInt()
  offsetDays: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  requiresOptIn?: boolean;
}

export class UpdateAutomationDto {
  @IsString()
  @IsOptional()
  templateKey?: string;

  @IsInt()
  @IsOptional()
  offsetDays?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  requiresOptIn?: boolean;
}

export class ValidateAutomationDto {
  @IsEnum(ModuleType)
  @IsNotEmpty()
  moduleType: ModuleType;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsString()
  @IsNotEmpty()
  templateKey: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsBoolean()
  @IsOptional()
  requiresOptIn?: boolean;
}
