import { SetMetadata } from '@nestjs/common';

export const RequirePlanFeature = (feature: string) =>
  SetMetadata('plan_feature', feature);
