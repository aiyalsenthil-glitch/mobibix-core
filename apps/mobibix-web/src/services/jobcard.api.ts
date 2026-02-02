import { authenticatedFetch } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type JobStatus =
  | "RECEIVED"
  | "ASSIGNED"
  | "DIAGNOSING"
  | "WAITING_APPROVAL"
  | "APPROVED"
  | "WAITING_FOR_PARTS"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

export interface JobCard {
  id: string;
  tenantId: string;
  shopId: string;
  jobNumber: string;
  publicToken: string;
  status: JobStatus;

  customerId?: string | null;

  customerName: string;
  customerPhone: string;
  customerAltPhone?: string;

  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  deviceSerial?: string;
  devicePassword?: string;

  customerComplaint: string;
  physicalCondition?: string;

  estimatedCost?: number;
  diagnosticCharge?: number;
  advancePaid?: number;
  billType?: string;
  estimatedDelivery?: Date | string;

  createdByUserId: string;
  createdByName: string;

  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateJobCardDto {
  customerId?: string;

  customerName?: string;
  customerPhone?: string;
  customerAltPhone?: string;

  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  deviceSerial?: string;
  devicePassword?: string;

  customerComplaint: string;
  physicalCondition?: string;

  estimatedCost?: number;
  diagnosticCharge?: number;
  advancePaid?: number;
  billType?: string;
  estimatedDelivery?: Date | string;
}

export interface UpdateJobCardDto {
  customerId?: string | null;

  customerName?: string;
  customerPhone?: string;
  customerAltPhone?: string;

  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceSerial?: string;
  devicePassword?: string;

  customerComplaint?: string;
  physicalCondition?: string;

  estimatedCost?: number;
  diagnosticCharge?: number;
  advancePaid?: number;
  billType?: string;
  estimatedDelivery?: Date | string;
}

/**
 * List all job cards for a shop
 */
export async function listJobCards(shopId: string): Promise<JobCard[]> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch job cards");
  }

  const data = await response.json();
  // Backend returns { jobCards: [...], empty: false }
  return data.jobCards || [];
}

/**
 * Get a single job card
 */
export async function getJobCard(
  shopId: string,
  jobCardId: string,
): Promise<JobCard> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards/${jobCardId}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch job card");
  }

  return response.json();
}

/**
 * Create a new job card
 */
export async function createJobCard(
  shopId: string,
  data: CreateJobCardDto,
): Promise<JobCard> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create job card");
  }

  return response.json();
}

/**
 * Update an existing job card
 */
export async function updateJobCard(
  shopId: string,
  jobCardId: string,
  data: UpdateJobCardDto,
): Promise<JobCard> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards/${jobCardId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update job card");
  }

  return response.json();
}

/**
 * Update job card status
 */
export async function updateJobCardStatus(
  shopId: string,
  jobCardId: string,
  status: JobStatus,
): Promise<JobCard> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards/${jobCardId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update status");
  }

  return response.json();
}

/**
 * Delete a job card
 */
export async function deleteJobCard(
  shopId: string,
  jobCardId: string,
): Promise<void> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards/${jobCardId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete job card");
  }
}
