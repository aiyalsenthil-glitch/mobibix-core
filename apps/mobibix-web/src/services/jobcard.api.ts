import { authenticatedFetch, extractData } from "./auth.api";
import { type Receipt } from "./receipts.api";
import { type SalesInvoice } from "./sales.api";

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
  | "RETURNED"
  | "SCRAPPED"
  | "REPAIR_FAILED"
  | "WAITING_CUSTOMER";

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
  deliveredAt?: Date | string;

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

  // Intelligence fields
  faultTypeId?: string | null;
  suggestedFaultTypeId?: string | null;
  qcCompleted?: boolean;

  // Additional UI fields
  whatsappSent?: boolean;
  shopName?: string;
}

export interface JobCardQC {
  id: string;
  jobCardId: string;
  cameraWorking: boolean;
  micWorking: boolean;
  speakerWorking: boolean;
  chargingWorking: boolean;
  wifiWorking: boolean;
  returnedCharger: boolean;
  returnedSimTray: boolean;
  returnedMemoryCard: boolean;
  technicianNotes?: string;
  completedAt?: Date | string;
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
  faultTypeId?: string;
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
  laborCharge?: number;
}

/**
 * List all job cards for a shop
 */
export async function listJobCards(
  shopId: string,
  filters?: { status?: string; customerName?: string; skip?: number; take?: number },
): Promise<{ jobCards: JobCard[]; total: number }> {
  const query = new URLSearchParams();
  if (filters?.status) query.append("status", filters.status);
  if (filters?.customerName) query.append("search", filters.customerName); // Backend uses 'search'
  if (filters?.skip !== undefined) query.append("skip", filters.skip.toString());
  if (filters?.take !== undefined) query.append("take", filters.take.toString());

  const url = `/mobileshop/shops/${shopId}/job-cards${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to fetch job cards");
  }

  const data: any = await extractData(response);
  return {
    jobCards: data.jobCards || [],
    total: data.total || 0
  };
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to fetch job card");
  }

  return extractData(response);
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to create job card");
  }

  return extractData(response);
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to update job card");
  }

  return extractData(response);
}

/**
 * Update job card status
 */
export async function updateJobCardStatus(
  shopId: string,
  jobCardId: string,
  status: JobStatus,
  refundDetails?: { amount: number; mode: string },
): Promise<JobCard> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards/${jobCardId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, refundDetails }),
    },
  );

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to update status");
  }

  return extractData(response);
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to reopen job");
  }

  return extractData(response);
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to add part");
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to remove part");
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to delete job card");
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to create warranty job");
  }


  return extractData(response);
}

/**
 * Add Advance to Job Card
 */
export async function addJobCardAdvance(
  shopId: string,
  jobCardId: string,
  amount: number,
  mode: string
): Promise<{ job: JobCard; receipt: Receipt }> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/job-cards/${jobCardId}/advance`,
    {
      method: "POST",
      body: JSON.stringify({ amount, mode }),
    }
  );

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to add advance");
  }

  return extractData(response);
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to refund advance");
  }

  return extractData(response);
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
  deliverImmediately?: boolean;
  loyaltyPointsRedeemed?: number;
}

/**
 * Generate Repair Bill
 */
export async function generateRepairBill(
  shopId: string,
  jobCardId: string,
  data: RepairBillDto
): Promise<SalesInvoice> {
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
        const error = await extractData(response);
        throw new Error((error as any).message || "Failed to generate bill");
    }

    return extractData(response);
}

/**
 * 👷 Pipeline Intelligence APIs
 */

export async function getBottlenecks(): Promise<any[]> {
  const response = await authenticatedFetch('/mobileshop/pipeline/bottlenecks');
  return extractData(response);
}

export async function getCustomerDelays(): Promise<any[]> {
  const response = await authenticatedFetch('/mobileshop/pipeline/delays');
  return extractData(response);
}

export async function getMyQueue(): Promise<JobCard[]> {
  const response = await authenticatedFetch('/mobileshop/pipeline/my-queue');
  return extractData(response);
}

export async function getJobQC(jobId: string): Promise<JobCardQC | null> {
  const response = await authenticatedFetch(`/mobileshop/pipeline/qc/${jobId}`);
  return extractData(response);
}

export async function saveJobQC(jobId: string, data: Partial<JobCardQC>): Promise<JobCardQC> {
  const response = await authenticatedFetch(`/mobileshop/pipeline/qc/${jobId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return extractData(response);
}

export async function suggestParts(faultTypeId: string): Promise<any[]> {
  const response = await authenticatedFetch(`/mobileshop/pipeline/suggest-parts/${faultTypeId}`);
  return extractData(response);
}

export async function suggestFault(complaint: string): Promise<{ id: string; name: string } | null> {
  const query = new URLSearchParams({ complaint });
  const response = await authenticatedFetch(`/mobileshop/pipeline/suggest-fault?${query.toString()}`);
  return extractData(response);
}
