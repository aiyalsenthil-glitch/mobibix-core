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
  role: AuthRole;
  tenantId?: string;
  planCode?: string;
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
      console.warn("Firebase not initialized. Authentication disabled.");
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
          setAuthUser(response.user);
        } catch (err: any) {
          console.error("Auth exchange error:", err);
          setError(err.message || "Authentication failed");
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

        setAuthUser(response.user);
        setFirebaseUser(REMOVED_AUTH_PROVIDERUser);

        // Post-login redirect based on tenant count/role
        // Use window.location.href (hard navigation) instead of router.replace()
        // to prevent the signin page from briefly flashing during soft navigation
        const redirectPath = getPostLoginRedirect(response);
        window.location.href = redirectPath;

        // Keep isLoading = true; the hard navigation will tear down this page
        return response as ExchangeTokenResponse;
      } catch (err: any) {
        setError(err.message || "Failed to exchange token");
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
      setFirebaseUser(null);
      setAuthUser(null);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Logout failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    REMOVED_AUTH_PROVIDERUser,
    authUser,
    isLoading,
    isAuthenticated: !!authUser,
    error,
    logout,
    exchangeToken,
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
