"use client";

import {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  ReactNode,
  FC,
  createElement,
} from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signOut,
} from "REMOVED_AUTH_PROVIDER/auth";
import { auth } from "@/lib/REMOVED_AUTH_PROVIDER";
import {
  exchangeFirebaseToken,
  logout as apiLogout,
  type ExchangeTokenResponse,
  type AuthRole,
} from "@/services/auth.api";
import { getRoleRedirect, getPostLoginRedirect } from "@/lib/auth-routes";
import { useRouter, usePathname } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  REMOVED_AUTH_PROVIDERUid: string;
  role: AuthRole | string;
  isSystemOwner: boolean;
  permissions?: string[];
  tenantId?: string;
  tenantType?: string;
  planCode?: string;
  isDistributor?: boolean;
  hasActiveERP?: boolean;
  pendingInvite?: {
    id: string;
    inviteToken: string;
    tenantId: string;
    role: string;
    shopIds: string[];
    tenant: {
      name: string;
      code: string;
    };
  } | null;
}

export interface AuthContextType {
  REMOVED_AUTH_PROVIDERUser: FirebaseUser | null;
  authUser: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  logout: () => Promise<void>;
  exchangeToken: (
    REMOVED_AUTH_PROVIDERUser: FirebaseUser,
    tenantCode?: string,
  ) => Promise<ExchangeTokenResponse>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [REMOVED_AUTH_PROVIDERUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If Firebase is not initialized, skip auth setup
    if (!auth) {

      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      setError(null);

      if (user) {
        setFirebaseUser(user);

        try {
          const response = await exchangeFirebaseToken(await user.getIdToken());
          setAuthUser({
            ...response.user,
            role: response.user.role?.toLowerCase(), // ✅ Normalize Role
            pendingInvite: response.pendingInvite,
          });
        } catch (err: unknown) {
          console.error("Auth exchange error:", err);
          setError((err as any)?.message || "Authentication failed");
          setFirebaseUser(null);
        }
      } else {
        setFirebaseUser(null);
        setAuthUser(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const exchangeToken = useCallback(
    async (REMOVED_AUTH_PROVIDERUser: FirebaseUser, tenantCode?: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const idToken = await REMOVED_AUTH_PROVIDERUser.getIdToken();

        const response = await exchangeFirebaseToken(idToken, tenantCode);

        setAuthUser({
          ...response.user,
          role: response.user.role?.toLowerCase(), // ✅ Normalize Role
          pendingInvite: response.pendingInvite,
        });
        setFirebaseUser(REMOVED_AUTH_PROVIDERUser);

        // Post-login redirect based on tenant count/role
        // Use window.location.href (hard navigation) instead of router.replace()
        // to prevent the signin page from briefly flashing during soft navigation
        const redirectPath = getPostLoginRedirect(response);
        window.location.href = redirectPath;

        // Keep isLoading = true; the hard navigation will tear down this page
        return response as ExchangeTokenResponse;
      } catch (err: unknown) {
        setError((err as any)?.message || "Failed to exchange token");
        setIsLoading(false);
        throw err;
      }
    },
    [],
  );

  // Redirect if authUser already resolved (e.g., page reload with valid token)
  useEffect(() => {
    if (!authUser) return;

    // Don't redirect if we are already on an app or print page
    if (!pathname) return;
    const appRoutePrefixes = [
      "/dashboard",
      "/sales",
      "/jobcards",
      "/products",
      "/inventory",
      "/customers",
      "/whatsapp",
      "/whatsapp-crm",
      "/suppliers",
      "/purchases",
      "/receipts",
      "/vouchers",
      "/reports",
      "/shops",
      "/staff",
      "/settings",
      "/print",
    ];

    if (appRoutePrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return;
    }

    // Only redirect from public/auth pages
    if (
      pathname?.startsWith("/signin") ||
      pathname?.startsWith("/signup")
    ) {
      const path = getRoleRedirect(authUser);
      window.location.href = path;
    }
  }, [authUser, pathname]);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      if (auth) {
        await signOut(auth);
      }
      await apiLogout();
      
      // Clear local caches
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("shops_cache");
      }

      setFirebaseUser(null);
      setAuthUser(null);
      setError(null);

      // Force hard redirect to clear all context/state
      window.location.href = "/auth";
    } catch (err: unknown) {
      setError((err as any)?.message || "Logout failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const { getCurrentUser } = await import("@/services/auth.api");
      const user = await getCurrentUser();
      
      if (user) {
        setAuthUser((prev) => ({
          ...prev,
          ...(user as unknown as AuthUser), // Merge new permissions/context
        }));
      }
    } catch (err) {

    } finally {
      setIsLoading(false);
    }
  }, []);

  // Phase 5: Rehydrate Context on Branch Change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBranchChange = () => { refreshSession(); };
    window.addEventListener("branch_changed", handleBranchChange);
    return () => window.removeEventListener("branch_changed", handleBranchChange);
  }, [refreshSession]);

  const value: AuthContextType = {
    REMOVED_AUTH_PROVIDERUser,
    authUser,
    isLoading,
    isAuthenticated: !!authUser,
    error,
    logout,
    exchangeToken,
    refreshSession,
  };

  return createElement(AuthContext.Provider, { value }, children);
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
