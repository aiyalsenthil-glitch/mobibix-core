import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BillingCycle, ModuleType } from '@prisma/client';

export class DowngradeSubscriptionDto {
  @IsString()
  newPlanId: string;

  @IsEnum(BillingCycle)
  @IsOptional()
  newBillingCycle?: BillingCycle;

  @IsOptional()
  isImmediate?: boolean;
}

export class DowngradeCheckQueryDto {
  @IsString()
  targetPlan: string;

  @IsEnum(ModuleType)
  @IsOptional()
  module?: ModuleType;
}
