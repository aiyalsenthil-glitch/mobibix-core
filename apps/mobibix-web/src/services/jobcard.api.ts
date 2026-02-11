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

  notes?: string;
  warrantyDuration?: number;

  estimatedCost?: number;
  finalCost?: number;
  diagnosticCharge?: number;
  advancePaid?: number;
  billType?: string;
  estimatedDelivery?: Date | string;

  createdByUserId: string;
  createdByName: string;
  assignedToUserId?: string | null;

  createdAt: Date | string;
  updatedAt: Date | string;

  invoices?: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    balanceAmount?: number;
  }[];

  parts?: {
    id: string;
    shopProductId: string;
    quantity: number;
    costPrice?: number;
    product: {
      id: string;
      name: string;
      salePrice: number;
      gstRate?: number;
      hsnCode?: string;
    };
  }[];

  // Owner specific fields
  jobCost?: number;
  profit?: number;
  revenue?: number;
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
  assignedToUserId?: string;
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
  assignedToUserId?: string | null;
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
 * Reopen a cancelled job card
 */
export async function reopenJobCard(
  shopId: string,
  jobCardId: string,
): Promise<JobCard> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards/${jobCardId}/reopen`,
    {
      method: "PATCH",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to reopen job");
  }

  return response.json();
}

/**
 * Add Part to Job Card
 */
export async function addJobCardPart(
  shopId: string,
  jobCardId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards/${jobCardId}/parts`,
    {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to add part");
  }
}

/**
 * Remove Part from Job Card
 */
export async function removeJobCardPart(
  shopId: string,
  jobCardId: string,
  partId: string,
): Promise<void> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards/${jobCardId}/parts/${partId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to remove part");
  }
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
/**
 * Create a new warranty rework job
 */
export async function createWarrantyJob(
  shopId: string,
  originalJobId: string,
): Promise<JobCard> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards/${originalJobId}/warranty`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create warranty job");
  }


  return response.json();
}

/**
 * Add Advance to Job Card
 */
export async function addJobCardAdvance(
  shopId: string,
  jobCardId: string,
  amount: number,
  mode: string
): Promise<{ job: JobCard; receipt: any }> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards/${jobCardId}/advance`,
    {
      method: "POST",
      body: JSON.stringify({ amount, mode }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to add advance");
  }

  return response.json();
}

/**
 * Refund Job Card Advance
 */
export async function refundJobCardAdvance(
  shopId: string,
  jobCardId: string,
  amount: number,
  mode: string
): Promise<JobCard> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards/${jobCardId}/advance/refund`,
    {
      method: "POST",
      body: JSON.stringify({ amount, mode }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to refund advance");
  }

  return response.json();
}

/**
 * Repair Bill DTO
 */
export interface RepairBillDto {
  shopId: string;
  jobCardId: string;
  services: { description: string; amount: number; gstRate?: number }[];
  parts?: { shopProductId: string; quantity: number; rate: number; gstRate: number }[];
  billingMode: 'WITH_GST' | 'WITHOUT_GST';
  paymentMode: string;
  pricesIncludeTax?: boolean;
}

/**
 * Generate Repair Bill
 */
export async function generateRepairBill(
  shopId: string,
  jobCardId: string,
  data: RepairBillDto
): Promise<any> {
    // Note: The backend controller is @Controller('mobileshop/repairs')
    // Post(':jobCardId/bill') -> /mobileshop/repairs/:jobCardId/bill
    const response = await authenticatedFetch(
        `/mobileshop/repairs/${jobCardId}/bill`,
        {
            method: "POST",
            body: JSON.stringify(data),
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate bill");
    }

    return response.json();
}
