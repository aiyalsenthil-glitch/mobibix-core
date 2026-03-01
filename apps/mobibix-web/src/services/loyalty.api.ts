import { authenticatedFetch, extractData } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export interface LoyaltyConfig {
  tenantId: string;
  isEnabled: boolean;
  earnAmountPerPoint: number; // ₹100 = 1 point
  pointsPerEarnUnit: number;
  pointValueInRupees: number; // 1 point = ₹1
  maxRedeemPercent: number; // Max 50%
  allowOnRepairs: boolean;
  allowOnAccessories: boolean;
  allowOnServices: boolean;
  expiryDays?: number | null;
  allowManualAdjustment: boolean;
  minInvoiceForEarn?: number | null;
  shopId?: string;
}

export interface LoyaltyBalance {
  customerId: string;
  balance: number; // In points
  pointValueInRupees: number;
}

export interface ValidateRedemptionRequest {
  customerId: string;
  points: number;
  invoiceSubTotal: number;
  shopId?: string;
}

export interface ValidateRedemptionResponse {
  success: boolean;
  points?: number;
  discountPaise?: number;
  error?: string;
}

export interface LoyaltyTransaction {
  id: string;
  tenantId: string;
  customerId: string;
  points: number;
  type: "EARN" | "REDEEM" | "EXPIRE" | "MANUAL" | "REVERSAL";
  source?: string;
  invoiceId?: string;
  reversalOf?: string;
  note?: string;
  createdBy?: string;
  createdAt: string | Date;
  customer?: {
    name: string;
  };
}

export interface LoyaltySummary {
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  netPointsBalance: number;
  activeCustomersWithPoints: number;
  shopId?: string;
}

/**
 * Get tenant's loyalty summary stats
 */
export async function getLoyaltySummary(
  startDate?: string,
  endDate?: string,
  shopId?: string,
): Promise<LoyaltySummary | null> {
  try {
    let url = `/loyalty/summary`;
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (shopId) params.append("shopId", shopId);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await authenticatedFetch(url);
    if (!response.ok) return null;
    const data: any = await extractData(response);
    return data;
  } catch (error) {
    console.error("Error fetching loyalty summary:", error);
    return null;
  }
}

/**
 * Get all loyalty transactions for the tenant
 */
export async function getAllLoyaltyTransactions(shopId?: string): Promise<LoyaltyTransaction[]> {
  try {
    let url = "/loyalty/transactions";
    if (shopId) url += `?shopId=${shopId}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) return [];
    const data: any = await extractData(response);
    return data.transactions || [];
  } catch (error) {
    console.error("Error fetching all loyalty transactions:", error);
    return [];
  }
}

/**
 * Get customer's loyalty balance
 */
export async function getCustomerLoyaltyBalance(
  customerId: string,
  shopId?: string,
): Promise<number> {
  try {
    let url = `/loyalty/balance/${customerId}`;
    if (shopId) url += `?shopId=${shopId}`;
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      console.error("Failed to fetch loyalty balance:", {
        status: response.status,
        customerId,
      });
      return 0; // Return 0 if error
    }

    const data: any = await extractData(response);
    return data.balance || 0;
  } catch (error) {
    console.error("Error fetching loyalty balance:", error);
    return 0;
  }
}

/**
 * Get customer's loyalty transaction history
 */
export async function getCustomerLoyaltyHistory(
  customerId: string,
  shopId?: string,
): Promise<LoyaltyTransaction[]> {
  try {
    let url = `/loyalty/history/${customerId}`;
    if (shopId) url += `?shopId=${shopId}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) return [];
    const data: any = await extractData(response);
    return data.transactions || [];
  } catch (error) {
    console.error("Error fetching loyalty history:", error);
    return [];
  }
}


/**
 * Validate if customer can redeem points
 * Returns max allowed points, discount amount, and validation status
 */
export async function validateLoyaltyRedemption(
  request: ValidateRedemptionRequest,
): Promise<ValidateRedemptionResponse> {
  try {
    const response = await authenticatedFetch(`/loyalty/validate-redemption`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = "Validation failed";
      try {
        const error = await extractData(response);
        errorMessage = (error as any).error || errorMessage;
      } catch (e) {
        // ignore json parse error
      }
      console.error("Validation error:", {
        status: response.status,
        message: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data: any = await extractData(response);
    return {
      success: data.success !== false,
      points: data.points,
      discountPaise: data.discountPaise,
      error: data.error,
    };
  } catch (error) {
    console.error("Error validating loyalty redemption:", error);
    return {
      success: false,
      error: "Failed to validate redemption",
    };
  }
}

/**
 * Get tenant's loyalty configuration
 */
export async function getLoyaltyConfig(shopId?: string): Promise<LoyaltyConfig | null> {
  try {
    let url = "/loyalty/config";
    if (shopId) url += `?shopId=${shopId}`;
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      console.error("Failed to fetch loyalty config:", {
        status: response.status,
      });
      return null;
    }

    const data: any = await extractData(response);
    return data;
  } catch (error) {
    console.error("Error fetching loyalty config:", error);
    return null;
  }
}

/**
 * Update tenant's loyalty configuration (admin only)
 */
export async function updateLoyaltyConfig(
  config: Partial<LoyaltyConfig>,
): Promise<LoyaltyConfig | null> {
  try {
    const response = await authenticatedFetch(`/loyalty/config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      console.error("Failed to update loyalty config:", {
        status: response.status,
      });
      return null;
    }

    const data: any = await extractData(response);
    return data.config;
  } catch (error) {
    console.error("Error updating loyalty config:", error);
    return null;
  }
}

/**
 * Create a manual loyalty adjustment (admin only)
 */
export async function createManualAdjustment(request: {
  customerId: string;
  points: number;
  reason: string;
  shopId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authenticatedFetch(`/loyalty/manual-adjustment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = "Failed to create adjustment";
      try {
        const error = await extractData(response);
        errorMessage = (error as any).message || errorMessage;
      } catch (e) {
        // ignore json parse error
      }
      return {
        success: false,
        error: errorMessage,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating manual adjustment:", error);
    return {
      success: false,
      error: "Failed to create adjustment",
    };
  }
}
