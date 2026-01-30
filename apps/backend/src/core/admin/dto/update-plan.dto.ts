import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  IsEnum,
} from 'class-validator';
import { WhatsAppFeature } from '@prisma/client';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxMembers?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePlanFeaturesDto {
  @IsEnum(WhatsAppFeature)
  feature: WhatsAppFeature;

  @IsBoolean()
  enabled: boolean;
}
