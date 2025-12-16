export class CreatePlanDto {
  name: string;
  price?: number;
  durationDays: number;
  features?: Record<string, any>;
}
