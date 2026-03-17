import { authenticatedFetch, extractData } from "./auth.api";

export type ForecastUrgency = "CRITICAL" | "LOW" | "OK";

export interface DemandForecastItem {
  shopProductId: string;
  name: string;
  sku?: string;
  category?: string;
  currentStock: number;
  avgDailyDemand: number;
  daysOfStock: number;
  totalSold90d: number;
  suggestedReorder: number;
  urgency: ForecastUrgency;
}

export async function getDemandForecast(
  shopId: string
): Promise<DemandForecastItem[]> {
  const res = await authenticatedFetch(
    `/reports/demand-forecast?shopId=${shopId}`
  );
  const data = await extractData<DemandForecastItem[] | { data?: DemandForecastItem[] }>(res);
  return Array.isArray(data) ? data : ((data as any)?.data ?? []);
}
