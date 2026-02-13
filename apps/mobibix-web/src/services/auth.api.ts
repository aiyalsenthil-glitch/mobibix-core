/**
 * Backend Auth API Service
 * Handles all communication with the backend auth endpoints
 * Cookie-based auth (httpOnly) + CSRF token header
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type AuthRole = "owner" | "staff" | "member" | "admin";

export interface AuthUserPayload {
  id: string;
  email: string;
  name?: string;
  REMOVED_AUTH_PROVIDERUid: string;
  role: AuthRole;
  tenantId?: string;
  planCode?: string; // e.g., 'MOBIBIX_TRIAL', 'MOBIBIX_STANDARD'
}

export interface CurrentUserResponse {
  id: string;
  email: string;
  fullName?: string | null;
  role: AuthRole;
  tenantId?: string | null;
  tenantType?: string | null;
  tenantName?: string | null;
}

export interface ExchangeTokenResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUserPayload;
  tenant?: {
    id: string;
    code: string;
    name: string;
    planCode?: string;
  };
  tenants?: Array<{
    id: string;
    code?: string;
    name?: string;
    role?: AuthRole;
    planCode?: string;
  }>;
  tenantCount?: number;
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
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken,
        ...(tenantCode && { tenantCode }),
      }),
    });

    if (!response.ok) {
      let errorData: any = {};
      const contentType = response.headers.get("content-type");

      try {
        if (contentType?.includes("application/json")) {
          errorData = await response.json();
        } else {
          const text = await response.text();
          console.error("Response text:", text);
          errorData = { message: text || "Non-JSON error response" };
        }
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError);
        errorData = { message: "Failed to parse error response" };
      }

      throw {
        code: errorData.code || "EXCHANGE_FAILED",
        message:
          errorData.message ||
          `HTTP ${response.status}: Failed to exchange token`,
        details: {
          ...errorData,
          status: response.status,
          url: `${API_BASE_URL}/auth/google/exchange`,
        },
      } as AuthError;
    }

    const data: ExchangeTokenResponse = await response.json();

    return data;
  } catch (error: any) {
    console.error("Token exchange error:", error);

    // Handle network errors (Connection refused / Server down)
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw {
        code: "NETWORK_ERROR",
        message:
          "Unable to connect to server. Please check your internet connection or try again later.",
        details: { originalError: error.message },
      } as AuthError;
    }

    throw error;
  }
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/([.$?*|{}()\[\]\\/\+^])/g, "\\$1")}=([^;]*)`,
    ),
  );

  return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfToken(): string | null {
  return getCookieValue("csrfToken");
}

export function hasSessionHint(): boolean {
  return !!getCsrfToken();
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getCsrfHeader(),
      },
    });
  } catch {
    // Ignore network failures during logout
  } finally {
    if (typeof document !== "undefined") {
      document.cookie = "csrfToken=; Max-Age=0; path=/";
    }
  }
}

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as CurrentUserResponse;
}

function getCsrfHeader(): Record<string, string> {
  const csrfToken = getCsrfToken();
  if (!csrfToken) return {};

  return { "X-CSRF-Token": csrfToken };
}

/**
 * Make authenticated API request to backend
 */
let refreshInFlight: Promise<"ok" | null> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...getCsrfHeader(),
          },
        });

        if (!response.ok) {
          await logout();
          return false;
        }

        return true;
      } catch {
        await logout();
        return false;
      } finally {
        refreshInFlight = null;
      }
    })().then((result) => (result ? "ok" : null));
  }

  return (await refreshInFlight) === "ok";
}

export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {},
  allowRetry = true,
): Promise<Response> {
  const headers = {
    "Content-Type": "application/json",
    ...getCsrfHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && allowRetry && !endpoint.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryHeaders = {
        ...headers,
        ...getCsrfHeader(),
      };
      return fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: retryHeaders,
        credentials: "include",
      });
    }
  }

  return response;
}
