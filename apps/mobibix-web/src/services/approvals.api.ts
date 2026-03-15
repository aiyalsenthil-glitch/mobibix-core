import { authenticatedFetch, extractData } from "./auth.api";

export interface ApprovalRequest {
  id: string;
  tenantId: string;
  shopId: string;
  requesterId: string;
  action: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  entityId?: string;
  meta: Record<string, unknown>;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  requester: {
    fullName: string;
    email: string;
  };
}

/**
 * Get pending approvals
 */
export async function getPendingApprovals(shopId?: string): Promise<ApprovalRequest[]> {
  const url = shopId 
    ? `/permissions/approvals/pending?shopId=${encodeURIComponent(shopId)}`
    : `/permissions/approvals/pending`;
    
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    const error = (await extractData(response)) as any;
    throw new Error(error?.message || "Failed to load pending approvals");
  }

  return extractData(response);
}

/**
 * Resolve an approval request
 */
export async function resolveApproval(
  id: string, 
  status: "APPROVED" | "REJECTED", 
  comment?: string
): Promise<Record<string, unknown>> {
  const response = await authenticatedFetch(`/permissions/approvals/${id}/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status, comment }),
  });

  if (!response.ok) {
    const error = (await extractData(response)) as any;
    throw new Error(error?.message || "Failed to respond to approval request");
  }

  return extractData(response);
}
