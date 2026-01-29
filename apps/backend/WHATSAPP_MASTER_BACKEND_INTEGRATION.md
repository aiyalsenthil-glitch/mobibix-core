# WHATSAPP MASTER - BACKEND INTEGRATION GUIDE

This document guides backend developers on implementing the necessary APIs to support the WhatsApp Master UI.

## 📋 Quick Summary

**New Database Tables**:

- `WhatsAppTemplate` (added to prisma/schema.prisma)
- `WhatsAppAutomation` (added to prisma/schema.prisma)

**Existing Tables Updated**:

- `WhatsAppSetting` (add `language` field if not present)

**No Breaking Changes**: All new fields are optional or have defaults.

## 🔧 Database Migration

The following Prisma models have been added to `prisma/schema.prisma`:

### 1. WhatsAppTemplate

```prisma
model WhatsAppTemplate {
  id                String   @id @default(uuid())
  tenantId          String
  templateKey       String   @unique
  metaTemplateName  String
  category          String   // UTILITY or MARKETING
  feature           String   // WELCOME, PAYMENT_DUE, EXPIRY, REMINDER
  language          String   @default("en")
  status            String   @default("ACTIVE")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([tenantId, templateKey])
  @@index([tenantId])
}
```

### 2. WhatsAppAutomation

```prisma
model WhatsAppAutomation {
  id              String   @id @default(uuid())
  tenantId        String
  triggerType     String   // PAYMENT_DUE, EXPIRY, REMINDER
  templateKey     String   // FK to WhatsAppTemplate
  offsetDays      Int
  enabled         Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([tenantId, triggerType])
  @@index([tenantId])
}
```

### 3. WhatsAppSetting (Update if needed)

If your `WhatsAppSetting` doesn't have a `language` field, add:

```prisma
model WhatsAppSetting {
  id        String   @id @default(uuid())
  tenantId  String   @unique
  enabled   Boolean  @default(false)
  language  String   @default("en")  // NEW: en, ta, hi
  provider  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**To apply migration**:

```bash
npx prisma migrate dev --name add_whatsapp_templates_and_automations
```

## 🛠️ API Endpoints to Implement

### 1. WhatsApp Settings

**GET** `/api/whatsapp/settings/:tenantId`

```typescript
// Response
{
  id: string,
  tenantId: string,
  enabled: boolean,
  language: 'en' | 'ta' | 'hi',
  provider: 'META',
  createdAt: Date,
  updatedAt?: Date
}
```

**PUT** `/api/whatsapp/settings/:tenantId`

```typescript
// Request Body
{
  enabled?: boolean,
  language?: 'en' | 'ta' | 'hi'
}

// Response - updated WhatsAppSetting object
```

### 2. WhatsApp Templates

**GET** `/api/whatsapp/templates/:tenantId`

```typescript
// Response - Array of templates
[
  {
    id: string,
    tenantId: string,
    templateKey: string,
    metaTemplateName: string,
    category: 'UTILITY' | 'MARKETING',
    feature: 'WELCOME' | 'PAYMENT_DUE' | 'EXPIRY' | 'REMINDER',
    language: string,
    status: 'ACTIVE' | 'DISABLED',
    createdAt: Date,
    updatedAt: Date,
  },
];
```

**PATCH** `/api/whatsapp/templates/:templateId`

```typescript
// Request Body (allow partial updates)
{
  metaTemplateName?: string,  // Only this can be edited
  status?: 'ACTIVE' | 'DISABLED'
}

// Response - updated template
```

### 3. WhatsApp Features (Read-only)

**GET** `/api/whatsapp/features`

```typescript
// Response - Plan rules
{
  BASIC: { enabled: false, features: [], maxMembers: 0 },
  PLUS: { enabled: true, features: ['PAYMENT_DUE', 'REMINDER'], maxMembers: 50 },
  PRO: { enabled: true, features: ['PAYMENT_DUE', 'REMINDER'], maxMembers: 600 },
  ULTIMATE: { enabled: true, features: ['WELCOME', 'EXPIRY', 'PAYMENT_DUE', 'REMINDER'], maxMembers: 500 }
}
```

### 4. WhatsApp Automations

**GET** `/api/whatsapp/automations/:tenantId`

```typescript
// Response - Array of automations
[
  {
    id: string,
    tenantId: string,
    triggerType: 'PAYMENT_DUE' | 'EXPIRY' | 'REMINDER',
    templateKey: string,
    offsetDays: number,
    enabled: boolean,
    createdAt: Date,
    updatedAt: Date,
  },
];
```

**PATCH** `/api/whatsapp/automations/:automationId`

```typescript
// Request Body
{
  templateKey?: string,
  offsetDays?: number,
  enabled?: boolean
}

// Response - updated automation
```

### 5. WhatsApp Logs

**GET** `/api/whatsapp/logs/:tenantId`

```typescript
// Query params (optional)
?status=SENT&type=WELCOME&dateFrom=2026-01-01&dateTo=2026-01-31

// Response - Array of logs
[
  {
    id: string,
    tenantId: string,
    memberId?: string,
    phone: string,
    type: 'WELCOME' | 'PAYMENT_DUE' | 'EXPIRY' | 'REMINDER',
    status: 'SENT' | 'FAILED' | 'SKIPPED',
    error?: string,
    sentAt: Date
  }
]
```

**POST** `/api/whatsapp/logs/:logId/retry`

```typescript
// Request Body (empty or with options)
{}

// Response
{
  success: boolean,
  message: string
}
```

### 6. Send Message (Campaign)

**POST** `/api/whatsapp/send`

```typescript
// Request Body
{
  tenantId: string,
  templateKey: string,
  recipients: string[],  // phone numbers
  variables?: Record<string, string>
}

// Response
{
  success: boolean,
  sentCount: number,
  failedCount: number,
  message: string
}
```

## 🔑 Implementation Notes

### Authentication

- All endpoints require JWT token in `Authorization: Bearer {token}` header
- Tenant is extracted from token context or URL param
- Validate tenant authorization before returning data

### Validation

- `templateKey` is immutable (prevent edits after creation)
- `language` must be one of: `en`, `ta`, `hi`
- `offsetDays` can be positive or negative
- `triggerType` must match automation rule type
- Phone numbers must include country code

### Error Handling

```typescript
// 400 Bad Request - invalid input
{
  error: 'Language must be one of: en, ta, hi';
}

// 401 Unauthorized - missing/invalid token
{
  error: 'Unauthorized';
}

// 403 Forbidden - tenant mismatch
{
  error: 'Access denied to this tenant';
}

// 404 Not Found - resource doesn't exist
{
  error: 'Template not found';
}

// 500 Internal Server Error - server error
{
  error: 'Failed to update setting';
}
```

### Permissions (RBAC)

- **SUPER_ADMIN**: Full access to all endpoints
- **TENANT_ADMIN**: Full access for own tenant
- **STAFF**: Can only POST to `/send`
- **VIEWER**: Can only GET `/logs`

## 🚀 Implementation Steps

1. **Update Database Schema**

   ```bash
   # Edit prisma/schema.prisma (already done)
   # Create migration
   npx prisma migrate dev --name add_whatsapp_tables
   ```

2. **Generate Prisma Client**

   ```bash
   npx prisma generate
   ```

3. **Create NestJS Module** `src/modules/whatsapp-admin/`

   ```
   whatsapp-admin/
   ├── whatsapp-admin.controller.ts
   ├── whatsapp-admin.service.ts
   ├── dto/
   │   ├── update-setting.dto.ts
   │   ├── update-template.dto.ts
   │   └── send-message.dto.ts
   └── whatsapp-admin.module.ts
   ```

4. **Implement Services**
   - Use existing `PrismaService`
   - Leverage `JwtAuthGuard` for auth
   - Call existing `WhatsAppSender` for send operations

5. **Update Existing Services**
   - `WhatsAppSender`: Fetch template by `templateKey` from DB
   - `WhatsAppRemindersService`: Use `WhatsAppAutomation` rules
   - Cron jobs: Query `WhatsAppAutomation.enabled === true`

6. **Seed Initial Templates** (Optional - for testing)
   ```typescript
   // prisma/seed.ts
   await prisma.whatsAppTemplate.upsert({
     where: { templateKey: 'WELCOME' },
     create: {
       tenantId: 'default-tenant',
       templateKey: 'WELCOME',
       metaTemplateName: 'new_member_welcome_v3',
       category: 'UTILITY',
       feature: 'WELCOME',
       language: 'en',
       status: 'ACTIVE',
     },
     update: {},
   });
   ```

## 📐 Architecture Notes

- **WhatsAppTemplate**: Replaces hardcoded `WhatsAppTemplates` enum
- **WhatsAppAutomation**: Stores trigger rules that cron jobs query
- **No cron changes needed**: Cron jobs read from `WhatsAppAutomation` table instead of hardcoded rules
- **Fallback behavior**: If template not found, log error and skip send

## 🧪 Testing Checklist

- [ ] CRUD operations on templates
- [ ] Update setting language
- [ ] Fetch automations for tenant
- [ ] RBAC blocks unauthorized access
- [ ] Error handling for invalid data
- [ ] Phone number validation in send
- [ ] Retry mechanism for failed logs
- [ ] JWT token validation

## 📞 Support

For questions about the UI implementation, refer to `apps/whatsapp-master/README.md`
