import { authenticatedFetch, setAccessToken, unwrapStandardResponse, extractData } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export interface TenantSubscription {
  id: string;
  status: string; // ACTIVE, TRIAL, etc.
  startDate: string;
  endDate: string;
  plan: {
    code: string;
    name: string;
    maxShops: number | null; // null = unlimited
    maxStaff: number | null;
    maxMembers: number | null;
    analyticsHistoryDays?: number; // Added for reports
  };
}

// Subscription Types
export interface CurrentTenantResponse {
  id: string;
  name: string;
  code: string;
  tenantType: string;
  subscription: TenantSubscription | null;
}

export interface SubscriptionDetails {
  plan: string;
  planCode: string;
  level: number; // Changed from planLevel to match backend
  memberLimit: number | null;
  maxStaff: number | null;
  maxShops?: number | null;
  whatsappAllowed: boolean;
  staffAllowed: boolean;
  attendanceAllowed: boolean;
  daysLeft: number;
  isTrial: boolean;
  subscriptionStatus: "ACTIVE" | "TRIAL" | "PAST_DUE" | "EXPIRED";

  autoRenew: boolean;
  billingType: "MANUAL" | "AUTOPAY";
  autopayStatus?: "ACTIVE" | "HALTED" | "CANCELLED" | "PAST_DUE" | null;
  subscriptionId: string;
  price?: number;
  analyticsHistoryDays?: number;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  displayName: string;
  tagline: string | null;
  description: string | null;
  featuresJson: string[] | null;
  level: number;
  billingCycles: { cycle: string; price: number }[];
  features: string[];
  isCurrent: boolean;
  canUpgrade: boolean;
  canDowngrade: boolean;
}

export interface AvailablePlansResponse {
  plans: Plan[];
}

export interface UpgradeSubscriptionResponse {
  paymentLink?: string;
  REMOVED_PAYMENT_INFRASubscriptionId?: string;
}

/**
 * Toggle Auto Renew
 */
export async function toggleAutoRenew(
  enabled: boolean,
): Promise<{ subscriptionId: string; autoRenew: boolean }> {
  const response = await authenticatedFetch(
    "/billing/subscription/auto-renew",
    {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    },
  );
  if (!response.ok) {
    throw new Error("Failed to update auto-renewal settings");
  }
  const json = await extractData(response);
  return unwrapStandardResponse(json);
}

/**
 * Fetch current subscription details
 */
export async function getSubscription(): Promise<{
  current: SubscriptionDetails;
}> {
  const response = await authenticatedFetch("/billing/subscription/current");
  if (!response.ok) {
    throw new Error("Failed to fetch subscription details");
  }
  const json = await extractData(response);
  return unwrapStandardResponse(json);
}

/**
 * Fetch available plans (optional module filter)
 */
export async function getAvailablePlans(module?: string): Promise<Plan[]> {
  const query = module ? `?module=${module}` : "";
  const response = await authenticatedFetch(`/plans/available${query}`);
  if (!response.ok) {
    throw new Error("Failed to fetch plans");
  }
  const json = await extractData(response);
  return unwrapStandardResponse(json);
}

/**
 * Upgrade Subscription (Immediate)
 */
export async function upgradeSubscription(
  newPlanId: string,
  newBillingCycle?: string,
  billingType?: "MANUAL" | "AUTOPAY",
): Promise<UpgradeSubscriptionResponse> {
  const response = await authenticatedFetch("/billing/subscription/upgrade", {
    method: "PATCH",
    body: JSON.stringify({ newPlanId, newBillingCycle, billingType }),
  });
  if (!response.ok) {
    const err = await extractData<{ message?: string }>(response);
    throw new Error(err.message || "Upgrade failed");
  }
  const json = await extractData(response);
  return unwrapStandardResponse<UpgradeSubscriptionResponse>(json);
}

/**
 * Downgrade Subscription (Scheduled)
 */
export async function downgradeSubscription(
  newPlanId: string,
  newBillingCycle?: string,
) {
  const response = await authenticatedFetch("/billing/subscription/downgrade", {
    method: "PATCH",
    body: JSON.stringify({ newPlanId, newBillingCycle }),
  });
  if (!response.ok) {
    const err = await extractData(response);
    throw new Error(err.message || "Downgrade failed");
  }
  const json = await extractData(response);
  return unwrapStandardResponse(json);
}

/**
 * Check Downgrade Eligibility
 */
export interface DowngradeCheckResponse {
  isEligible: boolean;
  blockers: string[];
  currentUsage: {
    staff: number;
    members: number | null;
    shops: number;
  };
  limits: {
    maxStaff: number | null;
    maxMembers: number | null;
    maxShops: number | null;
  };
}

export async function checkDowngradeEligibility(
  targetPlanId: string,
): Promise<DowngradeCheckResponse> {
  const response = await authenticatedFetch(
    `/billing/subscription/downgrade-check?targetPlan=${targetPlanId}`,
  );
  if (!response.ok) {
    throw new Error("Failed to check downgrade eligibility");
  }
  const json = await extractData(response);
  return unwrapStandardResponse(json);
}

/**
 * Get Usage History (Trends)
 */
export interface UsageSnapshot {
  id: string;
  date: string;
  activeMembers: number;
  activeStaff: number;
  activeShops: number;
}

export async function getUsageHistory(days = 30): Promise<UsageSnapshot[]> {
  const response = await authenticatedFetch(
    `/tenant/usage-history?days=${days}`,
  );
  if (!response.ok) {
    return []; // Fail silently or returns empty
  }
  const json = await extractData(response);
  return unwrapStandardResponse(json);
}
export async function getCurrentTenant(): Promise<CurrentTenantResponse> {
  const response = await authenticatedFetch("/tenant/current");
  if (!response.ok) {
    throw new Error("Failed to fetch tenant details");
  }
  const json = await extractData(response);
  return unwrapStandardResponse(json);
}

export interface UsageSummary {
  members: { used: number; limit: number | null };
  staff: { used: number; limit: number | null };
  whatsapp: {
    utility: { used: number; limit: number; friendlyText: string };
    marketing: { used: number; limit: number; friendlyText: string };
  };
  plan: { code: string; name: string; level: number };
  nextBillingDate: string | null;
  upgradeRecommended: boolean;
}

/**
 * Fetch usage summary with friendly WhatsApp quota text
 */
export async function getUsageSummary(): Promise<UsageSummary> {
  const response = await authenticatedFetch("/tenant/usage-summary");
  if (!response.ok) {
    throw new Error("Failed to fetch usage summary");
  }
  const json = await extractData(response);
  return unwrapStandardResponse(json);
}

/**
 * Create a new tenant (onboarding)
 */
export interface CreateTenantDto {
  name: string;
  tenantType: "GYM" | "MOBILE_SHOP" | "MOBILE_REPAIR" | "WHATSAPP_CRM";
  businessType?: string;
  legalName?: string;
  gstNumber?: string;
  contactPhone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  currency?: string;
  timezone?: string;
  country?: string;
  marketingConsent?: boolean;
  acceptedPolicyVersion?: string;
  promoCode?: string;
}

export interface RequestDeletionDto {
  acknowledged: boolean;
  reason?: string;
}

export interface CreateTenantResponse {
  tenant: {
    id: string;
    name: string;
    code: string;
    tenantType: string;
  };
  accessToken: string;
}

export async function createTenant(
  dto: CreateTenantDto,
): Promise<CreateTenantResponse> {
  const response = await authenticatedFetch("/tenant", {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const err = await extractData(response);
    throw new Error(err.message || "Failed to create tenant");
  }
  const json = await extractData(response);
  return unwrapStandardResponse(json);
}

export async function createTenantWithToken(
  dto: CreateTenantDto,
  accessToken: string,
): Promise<CreateTenantResponse> {
  const response = await fetch(`${API_BASE_URL}/tenant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const err = await extractData(response);
    throw new Error(err.message || "Failed to create tenant");
  }
  const json = await extractData(response);
  const data = unwrapStandardResponse<CreateTenantResponse>(json);
  if (data?.accessToken) {
    setAccessToken(data.accessToken);
  }
  return data;
}
export interface TenantUsageResponse {
  hasTenant: boolean;
  tenantId: string;
  status: string | null;
  isTrial: boolean;
  trialExpired: boolean;
  plan: {
    name: string;
    code: string;
    level: number;
    tagline: string | null;
    description: string | null;
    featuresJson: string[] | null;
    features: string[];
    memberLimit: number | null;
    staffAllowed: boolean;
    maxStaff: number | null;
    maxShops: number | null;
    whatsappAllowed: boolean;
  } | null;
  membersUsed: number;
  membersLimit: number | null;
  daysLeft: number | null;
  isLifetime?: boolean;
  showAds?: boolean;
  whatsappUsage: {
    marketing: number;
    utility: number;
    service: number;
    startOfPeriod: string;
  };
  // AI Usage
  aiTokensUsed: number;
  aiTokensLimit: number;
  aiTokensResetAt: string | null;
}

export async function getTenantUsage(): Promise<TenantUsageResponse> {
  const response = await authenticatedFetch("/tenant/usage");
  if (!response.ok) {
    throw new Error("Failed to fetch tenant usage");
  }
  const json = await extractData(response);
  return unwrapStandardResponse(json);
}

export async function requestDeletion(dto: RequestDeletionDto): Promise<any> {
  const response = await authenticatedFetch("/tenant/request-deletion", {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const err = await extractData(response);
    throw new Error(err.message || "Deletion request failed");
  }
  const json = await extractData(response);
  return unwrapStandardResponse(json);
}

export interface AiQuotaResponse {
  aiTokensUsed: number;
  aiTokensLimit: number;
  resetAt: string | null;
}

/**
 * Fetch current AI token quota for the active subscription
 */
export async function getAiQuota(): Promise<AiQuotaResponse | null> {
  try {
    const response = await authenticatedFetch("/tenant/ai-quota");
    if (!response.ok) return null;
    const json = await extractData<AiQuotaResponse>(response);
    return unwrapStandardResponse<AiQuotaResponse>(json);
  } catch {
    return null;
  }
}

export interface PromoPreview {
  valid: boolean;
  reason?: string;
  type?: string;
  benefit?: string;
  badge?: string;
  color?: 'teal' | 'amber' | 'blue' | 'purple';
  distributorName?: string;
  partnerName?: string;
}

export async function previewPromoCode(code: string): Promise<PromoPreview> {
  const res = await fetch(
    `${API_BASE_URL}/partners/promo/preview?code=${encodeURIComponent(code)}`,
  );
  const json = await res.json();
  return json?.data ?? json;
}
