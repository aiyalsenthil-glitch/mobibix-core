/**
 * Phase 1 Subscriptions DTOs
 */

import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ModuleType, BillingCycle } from '@prisma/client';

/**
 * Buy Plan Request
 */
export class BuyPlanDto {
  @IsUUID()
  planId: string;

  @IsEnum(ModuleType)
  module: ModuleType;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

/**
 * Upgrade Plan Request
 */
export class UpgradePlanDto {
  @IsUUID()
  newPlanId: string;
}

/**
 * Downgrade Plan Request
 */
export class DowngradePlanDto {
  @IsUUID()
  newPlanId: string;
}

/**
 * Toggle Auto-Renew Request
 */
export class ToggleAutoRenewDto {
  @IsBoolean()
  enabled: boolean;
}

/**
 * Subscription Response (API Response)
 */
export class SubscriptionResponseDto {
  id: string;
  tenantId: string;
  planId: string;
  module: ModuleType;
  status: string;
  startDate: string;
  endDate: string;
  billingCycle: BillingCycle;
  priceSnapshot: number;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}
