# AIYAL CORE ENGINE – RULES

## Core is a platform, not an app.

### Core owns:

- Auth
- Tenants
- Users & Staff
- Members
- Billing & Payments
- Audit Logs
- Notifications
- Database access

### Modules:

- Extend Core
- Never bypass Core
- Never access DB directly
- Never modify Core behavior

### Database:

- tenantId is mandatory everywhere
- Core tables are read-only to modules

### Stability:

- Core APIs are stable
- Breaking changes require version bump
