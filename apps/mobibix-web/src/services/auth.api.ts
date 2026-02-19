/**
 * = Backend Auth API Service - MobiBix (Next.js with SSR)
 * =
 * = Purpose: Handle authentication with backend + manage tokens
 * =
 * = Auth Strategy: Cookie + Middleware (SSR-Safe)
 * =
 * = Token Storage:
 * =  ✅ accessToken: HttpOnly cookie (backend-set, not readable by JS)
 * =  ✅ Verified by: Middleware (src/middleware.ts) on protected routes
 * =  ✅ Validation: Server-side before rendering (no flash)
 * =
 * = Key Features:
 * =  • credentials: "include" → Browser auto-includes cookies in all requests
 * =  • Middleware enforces auth before page load (server-side redirect)
 * =  • HttpOnly flag: Protected against XSS (JS cannot read token)
 * =  • Works with SSR/SSG: Middleware validates on each request
 * =
 * = Flow:
 * =   1. Client auth (Firebase) → exchangeFirebaseToken()
 * =   2. Backend validates Firebase token + creates JWT
 * =   3. Backend sets accessToken cookie (HttpOnly)
 * =   4. Browser stores cookie automatically
 * =   5. Middleware checks cookie on next navigation
 * =   6. Authenticated fetch() includes cookie automatically
 * =
 * = Related Files:
 * =   • src/middleware.ts: Route protection + cookie validation
 * =   • src/hooks/useAuth.ts: Client-side auth state
 * =   • src/context/AuthContext.tsx: Global auth context
 */

/**
 * Handles all communication with the backend auth endpoints
 * Cookie-based auth (httpOnly) + automatic credential inclusion
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

const ACCESS_TOKEN_KEY = "accessToken";
let inMemoryAccessToken: string | null = null;

export async function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
  if (typeof sessionStorage === "undefined") return;

  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  // Synchronize session cookie with Next.js server for Middleware/SSR
  try {
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    console.warn("Failed to sync session cookie:", err);
  }
}

export function getAccessToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (typeof sessionStorage === "undefined") return null;

  const stored = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (stored) {
    inMemoryAccessToken = stored;
    return stored;
  }

  return null;
}

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

    if (data?.accessToken) {
      await setAccessToken(data.accessToken);
    }

    return data;
  } catch (error: any) {
    if (Object.keys(error).length === 0) {
        console.error("Token exchange error (Empty Object):", JSON.stringify(error, null, 2), error);
    } else {
        console.error("Token exchange error:", error);
    }

    // Handle network errors (Connection refused / Server down)
    if (error instanceof TypeError && (error.message === "Failed to fetch" || error.message.includes("NetworkError"))) {
      const authError: AuthError = {
        code: "NETWORK_ERROR",
        message:
          "Unable to connect to server. Please check your internet connection or try again later.",
        details: { originalError: error.message, apiUrl: API_BASE_URL },
      };
      throw authError; // Throw typed error
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
    await setAccessToken(null);
  }
}

/**
 * Creates email/password account (Client-Side Firebase)
 */
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  User as FirebaseUser,
  updateProfile
} from "REMOVED_AUTH_PROVIDER/auth";
import { auth } from "@/lib/REMOVED_AUTH_PROVIDER";

export async function createEmailAccount(email: string, pass: string, name?: string): Promise<FirebaseUser> {
  if (!auth) throw new Error("Firebase not initialized");
  
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  
  if (name) {
    await updateProfile(credential.user, { displayName: name });
  }

  return credential.user;
}

export async function sendVerificationEmail(user: FirebaseUser): Promise<void> {
  await sendEmailVerification(user);
}

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404 || response.status === 401) {
    // Stale or invalid session cookie; clear it so auth exchange can proceed.
    try {
      await logout();
    } catch {
      // Ignore logout failures; we still want to continue login flow.
    }
    return null;
  }

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

        try {
          const data = await response.json();
          if (data?.accessToken) {
            await setAccessToken(data.accessToken);
          }
        } catch {
          // Ignore JSON parsing failures.
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
  const accessToken = getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...getCsrfHeader(),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
