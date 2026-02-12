"use client";

import { useRouter } from "next/navigation";
import {
  decodeAccessToken,
  getAccessToken,
  isAuthenticated,
} from "@/services/auth.api";

export function authGuard(router: ReturnType<typeof useRouter>): boolean {
  if (typeof window === "undefined") return true; // Server-side check pass

  const token = getAccessToken();

  if (!token || !isAuthenticated()) {
    // Prevent redirect loop if already on signin
    if (window.location.pathname !== "/signin" && window.location.pathname !== "/signup") {
      router.replace("/signin");
    }
    return false;
  }

  const claims = decodeAccessToken(token) || {};
  const hasTenant =
    !!claims.tenantId || (claims.tenants && claims.tenants.length > 0);

  if (!hasTenant) {
    if (window.location.pathname !== "/onboarding" && window.location.pathname !== "/select-tenant") {
      router.replace("/onboarding");
    }
    return false;
  }

  return true;
}
