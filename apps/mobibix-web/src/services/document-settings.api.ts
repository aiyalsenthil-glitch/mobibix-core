import { authenticatedFetch, extractData } from "./auth.api";
import type {
  DocumentNumberSetting,
  DocumentType,
  UpdateDocumentSettingDto,
} from "@/types/document-settings";

/**
 * Fetch all document numbering settings for a specific shop
 */
export async function getDocumentSettings(
  shopId: string,
): Promise<DocumentNumberSetting[]> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/document-settings`,
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to fetch settings" }));
    throw new Error(error.message || "Failed to fetch document settings");
  }

  return extractData(response);
}

/**
 * Update a specific document type's settings for a specific shop
 */
export async function updateDocumentSetting(
  shopId: string,
  documentType: DocumentType,
  updates: UpdateDocumentSettingDto,
): Promise<DocumentNumberSetting> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/document-settings/${documentType}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to update settings" }));
    throw new Error(error.message || "Failed to update document settings");
  }

  return extractData(response);
}
