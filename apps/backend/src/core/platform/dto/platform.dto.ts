import { IsOptional, IsBoolean, IsInt, IsArray, IsEnum } from 'class-validator';
import { WhatsAppFeature } from '../../billing/whatsapp-rules';

export class UpdatePlanDto {
  @IsOptional()
  @IsInt()
  maxMembers?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePlanFeatureDto {
  @IsEnum(WhatsAppFeature)
  feature: WhatsAppFeature;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdatePlanFeaturesDto {
  @IsArray()
  features: Array<{
    feature: WhatsAppFeature;
    enabled: boolean;
  }>;
}
