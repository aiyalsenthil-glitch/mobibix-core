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
  invoiceId?: string;
  reversalOf?: string;
  createdBy?: string;
  createdAt: string | Date;
}

/**
 * Get customer's loyalty balance
 */
export async function getCustomerLoyaltyBalance(
  customerId: string,
): Promise<number> {
  try {
    const response = await authenticatedFetch(`/loyalty/balance/${customerId}`);

    if (!response.ok) {
      console.error("Failed to fetch loyalty balance:", {
        status: response.status,
        customerId,
      });
      return 0; // Return 0 if error
    }

    const data = await extractData(response);
    return data.balance || 0;
  } catch (error) {
    console.error("Error fetching loyalty balance:", error);
    return 0;
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
        errorMessage = error.error || errorMessage;
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

    const data = await extractData(response);
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
export async function getLoyaltyConfig(): Promise<LoyaltyConfig | null> {
  try {
    const response = await authenticatedFetch(`/loyalty/config`);

    if (!response.ok) {
      console.error("Failed to fetch loyalty config:", {
        status: response.status,
      });
      return null;
    }

    const data = await extractData(response);
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

    const data = await extractData(response);
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
        errorMessage = error.message || errorMessage;
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
