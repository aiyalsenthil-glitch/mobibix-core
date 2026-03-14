import type {
  AuthUserPayload,
  AuthRole,
  ExchangeTokenResponse,
} from "@/services/auth.api";

// Compute post-login redirect path based on user status
export function getRoleRedirect(user: AuthUserPayload): string {
  // If user has a pending invite (from useAuth state), guide them to onboarding
  if ((user as any)?.pendingInvite) {
    return "/onboarding";
  }

  // Owners without a tenant must complete setup
  if (user.isSystemOwner && !user.tenantId) {
    return "/onboarding";
  }
  
  // Everyone else goes to dashboard if they have a tenant, or setup if they somehow don't
  return user.tenantId ? "/dashboard" : "/onboarding";
}

// Post-login routing using backend response (tenant counts)
export function getPostLoginRedirect(response: ExchangeTokenResponse): string {
  const { user, tenant, tenants, tenantCount, pendingInvite } = response;
  const count = tenantCount ?? tenants?.length ?? (tenant ? 1 : 0);

  // 1️⃣ Priority: Pending Invitation
  if (pendingInvite) return "/onboarding";

  // 2️⃣ No tenants yet
  if (!count || count === 0) return "/onboarding";

  // Multiple tenants → ask to select
  if (count > 1) return "/select-tenant";

  // Single tenant: prefer returned tenant, fallback to user.tenantId
  const tenantId = tenant?.id ?? tenants?.[0]?.id ?? user.tenantId;
  // Owners without a tenant must complete setup
  if (user.isSystemOwner && (!tenantId || tenantId === "")) {
    return "/onboarding";
  }

  // Everyone else goes to dashboard if they have a tenant, else onboarding
  return tenantId ? "/dashboard" : "/onboarding";
}
