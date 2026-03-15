import { ModuleType } from '@prisma/client';

export class CreatePlanDto {
  name: string;
  code?: string;
  level?: number;
  module: ModuleType;
  isActive?: boolean;
  isPublic?: boolean;
  isAddon?: boolean;
}
