import { authenticatedFetch, extractData } from "./auth.api";

export interface PhoneModelSuggestion {
  id: string;
  modelName: string;
  brandName: string;
  fullName: string;
}

export interface CompatiblePart {
  id: string;
  name: string;
  source: 'PART_CATALOG' | 'INVENTORY';
  price?: number;
  quantity?: number;
  otherModels?: string[];
}

export interface SearchCompatibilityResponse {
  model: string;
  compatibleParts: Record<string, CompatiblePart[]>;
  suggestions?: any[];
}

export async function autocompletePhoneModels(query: string): Promise<PhoneModelSuggestion[]> {
  const response = await authenticatedFetch(`/compatibility/autocomplete?query=${encodeURIComponent(query)}`);
  return extractData<PhoneModelSuggestion[]>(response);
}

export async function searchCompatibility(model: string): Promise<SearchCompatibilityResponse> {
  const response = await authenticatedFetch(`/compatibility/search?model=${encodeURIComponent(model)}`);
  return extractData<SearchCompatibilityResponse>(response);
}

export interface CompatibilityFeedbackInput {
  type: 'REPORT_ERROR' | 'SUGGEST_LINK';
  phoneModelId: string;
  targetModelId?: string;
  partType: string;
  details?: string;
}

export async function submitCompatibilityFeedback(data: CompatibilityFeedbackInput): Promise<any> {
  const response = await authenticatedFetch('/compatibility/feedback', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
}
