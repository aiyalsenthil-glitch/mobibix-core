import { authenticatedFetch, extractData } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

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
    `${API_BASE_URL}/reports/demand-forecast?shopId=${shopId}`
  );
  return extractData<DemandForecastItem[]>(res);
}
