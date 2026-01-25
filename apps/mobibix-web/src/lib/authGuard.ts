"use client";

import { useRouter } from "next/navigation";
import {
  decodeAccessToken,
  getAccessToken,
  isAuthenticated,
} from "@/services/auth.api";

export function authGuard(router: ReturnType<typeof useRouter>): boolean {
  const token = getAccessToken();

  if (!token || !isAuthenticated()) {
    router.replace("/signin");
    return false;
  }

  const claims = decodeAccessToken(token) || {};
  const hasTenant =
    !!claims.tenantId || !!(claims.tenants && claims.tenants.length);

  if (!hasTenant) {
    router.replace("/onboarding");
    return false;
  }

  return true;
}
