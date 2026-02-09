import { authenticatedFetch } from "./auth.api";

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
  planLevel: number;
  memberLimit: number | null;
  maxStaff: number | null;
  maxShops?: number | null; // Added
  whatsappAllowed: boolean;
  staffAllowed: boolean;
  attendanceAllowed: boolean;
  daysLeft: number;
  isTrial: boolean;
  subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'EXPIRED';
  autoRenew: boolean;
  subscriptionId: string;
  price?: number; // Optional, might come from plan details
}

export interface Plan {
  id: string;
  name: string; // Simplified: "TRIAL" | "STANDARD" | "PRO"
  displayName: string; // "Trial", "Standard", "Pro"
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

/**
 * Fetch current subscription details
 */
export async function getSubscription(): Promise<{ current: SubscriptionDetails }> {
  const response = await authenticatedFetch("/billing/subscription/current");
  if (!response.ok) {
    throw new Error("Failed to fetch subscription details");
  }
  return response.json();
}

/**
 * Fetch available plans
 */
export async function getAvailablePlans(): Promise<Plan[]> {
  const response = await authenticatedFetch("/plans/available");
  if (!response.ok) {
    throw new Error("Failed to fetch plans");
  }
  return response.json();
}

/**
 * Upgrade Subscription (Immediate)
 */
export async function upgradeSubscription(newPlanId: string, newBillingCycle?: string) {
  const response = await authenticatedFetch("/billing/subscription/upgrade", {
    method: "PATCH",
    body: JSON.stringify({ newPlanId, newBillingCycle }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Upgrade failed");
  }
  return response.json();
}

/**
 * Downgrade Subscription (Scheduled)
 */
export async function downgradeSubscription(newPlanId: string, newBillingCycle?: string) {
  const response = await authenticatedFetch("/billing/subscription/downgrade", {
    method: "PATCH",
    body: JSON.stringify({ newPlanId, newBillingCycle }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Downgrade failed");
  }
  return response.json();
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

export async function checkDowngradeEligibility(targetPlanId: string): Promise<DowngradeCheckResponse> {
    const response = await authenticatedFetch(`/billing/subscription/downgrade-check?targetPlan=${targetPlanId}`);
    if (!response.ok) {
        throw new Error("Failed to check downgrade eligibility");
    }
    return response.json();
    return response.json();
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
  const response = await authenticatedFetch(`/tenant/usage-history?days=${days}`);
  if (!response.ok) {
     return []; // Fail silently or returns empty
  }
  return response.json();
}
export async function getCurrentTenant(): Promise<CurrentTenantResponse> {
  const response = await authenticatedFetch("/tenant/current");
  if (!response.ok) {
    throw new Error("Failed to fetch tenant details");
  }
  return response.json();
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
  return response.json();
}

/**
 * Create a new tenant (onboarding)
 */
export interface CreateTenantDto {
  name: string;
  tenantType: "GYM" | "MOBILE_SHOP" | "MOBILE_REPAIR" | "WHATSAPP_CRM";
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

export async function createTenant(dto: CreateTenantDto): Promise<CreateTenantResponse> {
  const response = await authenticatedFetch("/tenant", {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Failed to create tenant");
  }
  return response.json();
}
