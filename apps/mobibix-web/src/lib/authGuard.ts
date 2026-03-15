"use client";

import { useRouter } from "next/navigation";
import { hasSessionHint } from "@/services/auth.api";

export function authGuard(router: ReturnType<typeof useRouter>): boolean {
  if (typeof window === "undefined") return true; // Server-side check pass

  // Check for session hint (accessToken in sessionStorage or mobi_session_hint cookie)
  // Note: mobi_session_hint is a same-origin cookie set by setAccessToken(),
  // unlike csrfToken which came from the cross-site backend and was unreliable in prod.
  if (!hasSessionHint()) {
    // Prevent redirect loop if already on signin
    if (
      window.location.pathname !== "/signin" &&
      window.location.pathname !== "/signup"
    ) {
      router.replace("/signin");
    }
    return false;
  }

  return true;
}
