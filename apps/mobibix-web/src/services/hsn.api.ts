import { authenticatedFetch, extractData } from "./auth.api";

export interface HSNCode {
  id: string;
  code: string;
  description?: string;
  taxRate: number;
}

export async function searchHsn(query: string): Promise<HSNCode[]> {
  if (!query || query.length < 2) return [];

  const response = await authenticatedFetch(
    `/core/hsn/search?query=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to search HSN codes");
  }

  return extractData(response);
}
