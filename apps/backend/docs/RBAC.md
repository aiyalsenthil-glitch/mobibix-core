# RBAC

## Purpose

- Define role-based access control for backend APIs.
- Clarify who can access which categories of endpoints.
- Provide a single reference for roles and guard usage.

## Key Responsibilities

- Enforce authentication with `JwtAuthGuard`.
- Enforce tenant scoping with tenant guards where required.
- Enforce role access with `@Roles()` and `RolesGuard`.
- Support permission-based checks with `@Permissions()` and `PermissionsGuard`.

## Public Interfaces

- `@Roles(UserRole.OWNER, UserRole.STAFF, ...)`
- `@Permissions(Permission.XYZ)`
- Guards: `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`, `TenantStatusGuard`.

## Business Rules

- Roles (primary): `SUPER_ADMIN`, `ADMIN`, `OWNER`, `STAFF`.
- `SUPER_ADMIN` is platform-level; should not be used for tenant-level actions.
- `ADMIN` and `OWNER` are tenant-level elevated roles; `STAFF` is limited.
- Public endpoints must be explicitly marked and must not access tenant data.
- Tenant-scoped endpoints must not accept `tenantId` from request body.
- Always prefer guard-based enforcement over manual checks in controllers.

## Important Notes

- Role casing must match backend `UserRole` enum.
- Use consistent role checks across controllers and services.
- Avoid mixing legacy role logic (e.g., admin-only in UI) with backend rules.
- When introducing new endpoints, add both role and permission checks.
