import type {
  AuthUserPayload,
  AuthRole,
  ExchangeTokenResponse,
} from "@/services/auth.api";

// Compute post-login redirect path based on user status
export function getRoleRedirect(user: AuthUserPayload): string {
  if ((user as any)?.pendingInvite) return "/onboarding";

  // Pure distributor (no ERP tenant) → go straight to distributor hub
  if (user.isDistributor && !user.tenantId) return "/distributor/dashboard";

  if (user.isSystemOwner && !user.tenantId) return "/onboarding";

  // If active tenant is not MOBILE_SHOP (e.g. DIGITAL_LEDGER), needs MOBILE_SHOP onboarding
  if (user.tenantId && (user as any).tenantType && (user as any).tenantType !== "MOBILE_SHOP") {
    return "/onboarding";
  }

  return user.tenantId ? "/dashboard" : "/onboarding";
}

// Post-login routing using backend response (tenant counts)
export function getPostLoginRedirect(response: ExchangeTokenResponse): string {
  const { user, tenant, tenants, tenantCount, pendingInvite } = response;
  const count = tenantCount ?? tenants?.length ?? (tenant ? 1 : 0);

  // 1️⃣ Priority: Pending Invitation
  if (pendingInvite) return "/onboarding";

  // 2️⃣ Pure distributor (no tenant) → distributor hub, skip onboarding
  if (user.isDistributor && !user.tenantId && (!count || count === 0)) {
    return "/distributor/dashboard";
  }

  // 3️⃣ No tenants at all (and not a distributor)
  if (!count || count === 0) return "/onboarding";

  // 4️⃣ Multiple tenants → tenant selector
  if (count > 1) return "/select-tenant";

  // 5️⃣ Single tenant: if it's NOT MOBILE_SHOP (e.g. DIGITAL_LEDGER), needs MobiBix onboarding
  if (user.tenantType && user.tenantType !== "MOBILE_SHOP") {
    return "/onboarding";
  }

  const tenantId = tenant?.id ?? tenants?.[0]?.id ?? user.tenantId;
  if (user.isSystemOwner && (!tenantId || tenantId === "")) return "/onboarding";

  return tenantId ? "/dashboard" : "/onboarding";
}
