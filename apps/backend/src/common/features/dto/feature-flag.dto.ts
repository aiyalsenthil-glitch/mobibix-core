import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { FeatureFlag, FeatureFlagScope } from '../feature-flags.constants';

/**
 * DTO for setting a feature flag
 */
export class SetFeatureFlagDto {
  @IsEnum(FeatureFlag)
  flag: FeatureFlag;

  @IsBoolean()
  enabled: boolean;

  @IsEnum(FeatureFlagScope)
  scope: FeatureFlagScope;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for querying feature flags
 */
export class GetFeatureFlagsDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  shopId?: string;
}
