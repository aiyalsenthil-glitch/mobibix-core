import type {
  AuthUserPayload,
  AuthRole,
  ExchangeTokenResponse,
} from "@/services/auth.api";

// Compute post-login redirect path based on role and tenant assignment
export function getRoleRedirect(user: AuthUserPayload): string {
  switch (user.role as AuthRole) {
    case "owner":
      return user.tenantId ? "/dashboard" : "/setup-business";
    case "staff":
      return user.tenantId ? "/dashboard" : "/setup-business";
    case "member":
      return "/dashboard";
    case "admin":
      return "/dashboard";
    default:
      return "/dashboard";
  }
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

  if (user.role === "owner") return tenantId ? "/dashboard" : "/dashboard";
  if (user.role === "staff") return tenantId ? "/dashboard" : "/dashboard";
  if (user.role === "member") return "/dashboard";
  if (user.role === "admin") return "/dashboard";
  return "/dashboard";
}
