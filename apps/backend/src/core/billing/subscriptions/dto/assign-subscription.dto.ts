import { IsEnum, IsOptional } from 'class-validator';
import { ModuleType } from '@prisma/client';

export class AssignSubscriptionDto {
  tenantId: string;
  planId: string;

  @IsEnum(ModuleType)
  @IsOptional()
  module?: ModuleType = ModuleType.MOBILE_SHOP;
}
