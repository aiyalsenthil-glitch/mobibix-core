/**
 * Backend Auth API Service
 * Handles all communication with the backend auth endpoints
 * Stores and manages JWT tokens
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

interface ExchangeTokenResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
    REMOVED_AUTH_PROVIDERUid: string;
    role: "owner" | "staff" | "member";
    tenantId?: string;
  };
  tenant?: {
    id: string;
    code: string;
    name: string;
  };
}

interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Exchange Firebase ID token for app JWT
 * This is the main entry point for authentication
 */
export async function exchangeFirebaseToken(
  idToken: string,
  tenantCode?: string,
): Promise<ExchangeTokenResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/google/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken,
        ...(tenantCode && { tenantCode }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw {
        code: error.code || "EXCHANGE_FAILED",
        message: error.message || "Failed to exchange token",
        details: error,
      } as AuthError;
    }

    const data: ExchangeTokenResponse = await response.json();

    // Store the access token
    storeAccessToken(data.accessToken);

    return data;
  } catch (error) {
    console.error("Token exchange error:", error);
    throw error;
  }
}

/**
 * Store JWT access token in localStorage
 * In production, consider using httpOnly cookies instead
 */
export function storeAccessToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", token);
    // Set token in memory for current session
    sessionStorage.setItem("accessToken", token);
  }
}

/**
 * Retrieve stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    return (
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken")
    );
  }
  return null;
}

/**
 * Clear stored access token (logout)
 */
export function clearAccessToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("accessToken");
  }
}

/**
 * Decode JWT to get user data (client-side only, don't trust claims)
 */
export function decodeAccessToken(token: string): Record<string, any> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token format");

    const decoded = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf-8"),
    );
    return decoded;
  } catch (error) {
    console.error("Token decode error:", error);
    return {};
  }
}

/**
 * Get authorization header for API requests
 */
export function getAuthHeader(): Record<string, string> {
  const token = getAccessToken();
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Check if token exists and is not expired
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const decoded = decodeAccessToken(token);
    const exp = decoded.exp;

    if (!exp) return true; // No expiration claim

    return exp * 1000 > Date.now(); // exp is in seconds
  } catch {
    return false;
  }
}

/**
 * Make authenticated API request to backend
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...options.headers,
  };

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}
