/**
 * ════════════════════════════════════════════════════
 * GUARD PRESETS - Standardized Guard Combinations
 * ════════════════════════════════════════════════════
 * Phase 2 Security Enhancement: Standardize guard usage
 *
 * These presets ensure consistent authorization across controllers
 * and prevent dual RBAC enforcement issues.
 *
 * Usage:
 * ```typescript
 * @Controller('members')
 * @UseGuards(...StandardGuards)
 * @Roles(UserRole.OWNER, UserRole.STAFF)
 * export class MembersController {}
 * ```
 */

import { JwtAuthGuard } from './jwt-auth.guard';
import { TenantRequiredGuard } from './tenant.guard';
import { TenantStatusGuard } from '../../tenant/guards/tenant-status.guard';
import { RolesGuard } from './roles.guard';

/**
 * StandardGuards - For typical tenant-scoped operations
 *
 * ✅ Validates JWT authentication
 * ✅ Ensures user belongs to a tenant
 * ✅ Checks tenant subscription status (active/trial)
 * ✅ Enforces role-based access control
 *
 * @example
 * ```typescript
 * @Controller('gym/members')
 * @UseGuards(...StandardGuards)
 * @Roles(UserRole.OWNER, UserRole.STAFF)
 * export class MembersController {}
 * ```
 */
export const StandardGuards = [
  JwtAuthGuard,
  TenantRequiredGuard,
  TenantStatusGuard,
  RolesGuard,
];

/**
 * AdminGuards - For admin-only operations
 *
 * ✅ Validates JWT authentication
 * ✅ Enforces admin role
 *
 * Note: Admin operations bypass tenant checks since admins
 * can operate across tenants.
 *
 * @example
 * ```typescript
 * @Controller('admin/tenants')
 * @UseGuards(...AdminGuards)
 * @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 * export class AdminTenantController {}
 * ```
 */
export const AdminGuards = [JwtAuthGuard, RolesGuard];

/**
 * BasicAuthGuards - For endpoints requiring only authentication
 *
 * ✅ Validates JWT authentication
 *
 * Use for endpoints that need authentication but don't require
 * tenant context or role checks (e.g., user profile, settings).
 *
 * @example
 * ```typescript
 * @Controller('user/profile')
 * @UseGuards(...BasicAuthGuards)
 * export class ProfileController {}
 * ```
 */
export const BasicAuthGuards = [JwtAuthGuard];

/**
 * TenantAuthGuards - For tenant-scoped operations without subscription check
 *
 * ✅ Validates JWT authentication
 * ✅ Ensures user belongs to a tenant
 * ✅ Enforces role-based access control
 *
 * Use for tenant-scoped endpoints that should work even if subscription
 * is expired (e.g., billing page, subscription management).
 *
 * @example
 * ```typescript
 * @Controller('billing')
 * @UseGuards(...TenantAuthGuards)
 * @Roles(UserRole.OWNER)
 * export class BillingController {}
 * ```
 */
export const TenantAuthGuards = [JwtAuthGuard, TenantRequiredGuard, RolesGuard];

/**
 * ════════════════════════════════════════════════════
 * GUARD SELECTION GUIDE
 * ════════════════════════════════════════════════════
 *
 * | Scenario | Guard Preset | @Roles Decorator |
 * |----------|--------------|------------------|
 * | Tenant operations (members, check-ins, etc.) | StandardGuards | OWNER, STAFF |
 * | Admin panel endpoints | AdminGuards | ADMIN, SUPER_ADMIN |
 * | User profile/settings | BasicAuthGuards | (none) |
 * | Billing/subscription pages | TenantAuthGuards | OWNER |
 * | Public endpoints (auth, webhooks) | (none) | @Public() decorator |
 *
 * ════════════════════════════════════════════════════
 *
 * **IMPORTANT: Avoid Manual Role Checks**
 *
 * ❌ DON'T DO THIS:
 * ```typescript
 * async updateMember(@Req() req) {
 *   if (req.user.role !== 'OWNER') {
 *     throw new ForbiddenException();
 *   }
 *   // ...
 * }
 * ```
 *
 * ✅ INSTEAD DO THIS:
 * ```typescript
 * @Patch(':id')
 * @Roles(UserRole.OWNER)
 * async updateMember(@Req() req) {
 *   // Role check handled by RolesGuard
 *   // ...
 * }
 * ```
 *
 * Manual role checks create dual RBAC enforcement issues and
 * increase the risk of authorization bypass vulnerabilities.
 */
