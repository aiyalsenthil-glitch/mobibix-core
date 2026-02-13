"use client";

import { useRouter } from "next/navigation";
import { hasSessionHint } from "@/services/auth.api";

export function authGuard(router: ReturnType<typeof useRouter>): boolean {
  if (typeof window === "undefined") return true; // Server-side check pass

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
