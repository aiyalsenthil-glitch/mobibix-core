import { authenticatedFetch, extractData } from "./auth.api";

export interface FaultType {
  id: string;
  name: string;
}

export interface FaultDiagnosisStep {
  id: string;
  order: number;
  stepText: string;
}

export interface FaultDiagnosis {
  id: string;
  faultTypeId: string;
  tenantId?: string | null;
  description?: string | null;
  steps: FaultDiagnosisStep[];
  faultType: FaultType;
}

export type RepairKnowledgeStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RepairKnowledgeSource = "SYSTEM" | "ADMIN" | "COMMUNITY";

export interface RepairNote {
  id: string;
  phoneModelId?: string | null;
  faultTypeId: string;
  content: string;
  videoUrl?: string | null;
  tenantId?: string | null;
  userId?: string | null;
  status: RepairKnowledgeStatus;
  source: RepairKnowledgeSource;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
}

export interface KnowledgeForJobResponse {
  checklist: FaultDiagnosis | null;
  notes: RepairNote[];
  suggestedFaultTypes: FaultType[] | null;
  jobDetails: {
    brand: string;
    model: string;
    problem: string;
    phoneModelId: string | null;
    faultTypeId: string | null;
  };
}

/**
 * Get full knowledge context for a job card
 */
export async function getKnowledgeForJob(jobCardId: string): Promise<KnowledgeForJobResponse> {
  const response = await authenticatedFetch(`/mobileshop/knowledge/job/${jobCardId}`);
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to fetch knowledge for job");
  }
  return extractData(response);
}

/**
 * List all standard fault types
 */
export async function listFaultTypes(): Promise<FaultType[]> {
  const response = await authenticatedFetch(`/mobileshop/knowledge/fault-types`);
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to fetch fault types");
  }
  return extractData(response);
}

/**
 * Vote on a repair note
 */
export async function voteOnNote(noteId: string, vote: "helpful" | "notHelpful"): Promise<void> {
  const response = await authenticatedFetch(`/mobileshop/knowledge/notes/${noteId}/vote`, {
    method: "POST",
    body: JSON.stringify({ vote }),
  });
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to register vote");
  }
}

/**
 * Submit a new repair note
 */
export async function submitRepairNote(data: {
  phoneModelId?: string | null;
  faultTypeId: string;
  content: string;
  videoUrl?: string;
  source?: RepairKnowledgeSource;
}): Promise<RepairNote> {
  const response = await authenticatedFetch(`/mobileshop/knowledge/notes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to submit repair note");
  }
  return extractData(response);
}

/**
 * Moderate a note (Admin/Owner only)
 */
export async function moderateNote(noteId: string, status: RepairKnowledgeStatus): Promise<RepairNote> {
  const response = await authenticatedFetch(`/mobileshop/knowledge/notes/${noteId}/moderate`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to moderate note");
  }
  return extractData(response);
}

/**
 * Create or update a diagnostic checklist
 */
export async function upsertChecklist(data: {
  faultTypeId: string;
  description?: string;
  steps: { order: number; stepText: string }[];
}): Promise<FaultDiagnosis> {
  const response = await authenticatedFetch(`/mobileshop/knowledge/checklist`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to save checklist");
  }
  return extractData(response);
}

/**
 * Get diagnostic checklist for a fault type
 */
export async function getChecklist(faultTypeId: string): Promise<FaultDiagnosis | null> {
  const response = await authenticatedFetch(`/mobileshop/knowledge/checklist/${faultTypeId}`);
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to fetch checklist");
  }
  return extractData(response);
}

/**
 * Get repair notes for a model and/or fault type
 */
export async function getRepairNotes(params: {
  phoneModelId?: string;
  faultTypeId?: string;
}): Promise<RepairNote[]> {
  const query = new URLSearchParams();
  if (params.phoneModelId) query.set("phoneModelId", params.phoneModelId);
  if (params.faultTypeId) query.set("faultTypeId", params.faultTypeId);

  const response = await authenticatedFetch(`/mobileshop/knowledge/notes?${query.toString()}`);
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to fetch repair notes");
  }
  return extractData(response);
}
