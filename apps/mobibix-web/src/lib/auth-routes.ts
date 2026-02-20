import type {
  AuthUserPayload,
  AuthRole,
  ExchangeTokenResponse,
} from "@/services/auth.api";

// Compute post-login redirect path based on user status
export function getRoleRedirect(user: AuthUserPayload): string {
  // Owners without a tenant must complete setup
  if (user.isSystemOwner && !user.tenantId) {
    return "/setup-business";
  }
  
  // Everyone else goes to dashboard if they have a tenant, or setup if they somehow don't
  return user.tenantId ? "/dashboard" : "/setup-business";
}

// Post-login routing using backend response (tenant counts)
export function getPostLoginRedirect(response: ExchangeTokenResponse): string {
  const { user, tenant, tenants, tenantCount } = response;
  const count = tenantCount ?? tenants?.length ?? (tenant ? 1 : 0);

  // No tenants yet
  if (!count || count === 0) return "/onboarding";

  // Multiple tenants → ask to select
  if (count > 1) return "/select-tenant";

  // Single tenant: prefer returned tenant, fallback to user.tenantId
  const tenantId = tenant?.id ?? tenants?.[0]?.id ?? user.tenantId;
  // Owners without a tenant must complete setup
  if (user.isSystemOwner && (!tenantId || tenantId === "")) {
    return "/setup-business";
  }

  // Everyone else goes to dashboard if they have a tenant, else onboarding
  return tenantId ? "/dashboard" : "/onboarding";
}
