import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  IsEnum,
} from 'class-validator';
import { WhatsAppFeature, ModuleType } from '@prisma/client';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;

  @IsOptional()
  @IsEnum(ModuleType)
  module?: ModuleType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isAddon?: boolean;
}

export class UpdatePlanFeaturesDto {
  @IsEnum(WhatsAppFeature)
  feature: WhatsAppFeature;

  @IsBoolean()
  enabled: boolean;
}
