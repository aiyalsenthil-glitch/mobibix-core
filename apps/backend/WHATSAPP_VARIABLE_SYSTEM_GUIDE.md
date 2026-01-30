# WhatsApp Template Variable System - Complete Guide

## 🎯 Overview

A **robust, module-aware** WhatsApp template variable system that prevents broken messages and scales across multiple business modules (Gym, Mobile Sales, Mobile Repair).

### Core Principles

✅ **Variables are DATA BINDINGS**, not free text  
✅ **Admins NEVER type {{1}}, {{2}} manually**  
✅ **Variables map to Prisma fields or computed values**  
✅ **System prevents sending incomplete messages**  
✅ **One unified system, not per-module logic**

---

## 📁 Architecture

```
Backend (NestJS):
├── variable-registry.ts       # Variable definitions (ENTITY, COMPUTED, MANUAL)
├── variable-resolver.service.ts # Extracts values from Prisma entities
└── whatsapp.module.ts         # DI registration

Frontend (Next.js):
├── lib/variable-registry.ts   # Frontend mirror of backend registry
└── app/templates/page.tsx     # Template management UI (module-scoped)
```

---

## 🏗️ Variable Types

### 1. **ENTITY Variables** (Direct Prisma Fields)

Mapped 1:1 to database columns. Automatically resolved.

**Example:**

```typescript
memberName: {
  key: 'memberName',
  label: 'Member Name',
  module: WhatsAppModule.GYM,
  sourceType: VariableSourceType.ENTITY,
  sourcePath: 'Member.fullName', // ← Prisma path
  dataType: VariableDataType.STRING,
  required: true,
}
```

**Resolution:**

```typescript
// Backend automatically queries:
const member = await prisma.member.findUnique({ where: { id: memberId } });
return member.fullName; // "John Doe"
```

---

### 2. **COMPUTED Variables** (Calculations)

Derived from multiple fields or aggregations.

**Example:**

```typescript
dueAmount: {
  key: 'dueAmount',
  label: 'Amount Due',
  module: WhatsAppModule.GYM,
  sourceType: VariableSourceType.COMPUTED,
  sourcePath: 'Member.feeAmount - Member.paidAmount',
  dataType: VariableDataType.CURRENCY,
  required: true,
  description: 'Auto-calculated: Total Fee - Paid Amount',
}
```

**Resolution:**

```typescript
// Backend computes:
const member = await prisma.member.findUnique({...});
return member.feeAmount - member.paidAmount; // 5000 - 2000 = 3000
```

---

### 3. **MANUAL Variables** (User Input)

Admin provides value at send time (for custom messages).

**Example:**

```typescript
customMessage: {
  key: 'customMessage',
  label: 'Custom Message',
  sourceType: VariableSourceType.MANUAL,
  sourcePath: 'user_input',
  dataType: VariableDataType.STRING,
  required: false,
  validationRules: { maxLength: 500 },
}
```

**UI Behavior:**

```tsx
// Frontend shows input field:
<Input
  placeholder="Enter custom message..."
  maxLength={500}
  value={manualInputs.customMessage}
  onChange={...}
/>
```

---

## 📦 Module Isolation

Templates are **module-scoped**. Each module has its own variable namespace.

### Available Modules

| Module          | Description          | Template Scope                  |
| --------------- | -------------------- | ------------------------------- |
| `GYM`           | Gym Management       | All gym tenants share templates |
| `MOBILE_SALES`  | Mobile Shop - Sales  | All mobile shop tenants share   |
| `MOBILE_REPAIR` | Mobile Shop - Repair | All mobile shop tenants share   |
| `SUPPLIER`      | Supplier Management  | Future use                      |

### Module → Variable Mapping

```typescript
// GYM variables
getVariablesByModule(WhatsAppModule.GYM);
// Returns: memberName, membershipEndDate, dueAmount, gymName...

// MOBILE_SALES variables
getVariablesByModule(WhatsAppModule.MOBILE_SALES);
// Returns: customerName, invoiceNumber, invoiceTotalAmount...

// MOBILE_REPAIR variables
getVariablesByModule(WhatsAppModule.MOBILE_REPAIR);
// Returns: jobNumber, deviceFullName, jobStatus, balanceAmount...
```

**Cross-module variables are FORBIDDEN** → Prevents mixing gym data with job card data.

---

## 🎨 Template Creation Flow

### Step 1: Select Module

Admin chooses which module the template belongs to (GYM / MOBILE_SALES / MOBILE_REPAIR).

### Step 2: Write Template Text

```
Hello {{1}}, your membership expires on {{2}}.
Please pay ₹{{3}} before {{4}} to continue.
```

### Step 3: Map Variables

System auto-detects 4 placeholders. Admin maps each:

| Placeholder | Variable            | Source Type | Required |
| ----------- | ------------------- | ----------- | -------- |
| {{1}}       | Member Name         | Auto        | ✅       |
| {{2}}       | Membership End Date | Auto        | ✅       |
| {{3}}       | Due Amount          | Calculated  | ✅       |
| {{4}}       | Payment Due Date    | Auto        | ❌       |

### Step 4: Live Preview

```
Hello John Doe, your membership expires on 31/12/2025.
Please pay ₹3,000 before 25/12/2025 to continue.
```

### Step 5: Save

Template stored with metadata:

```json
{
  "moduleType": "GYM",
  "templateKey": "PAYMENT_DUE",
  "metaTemplateName": "payment_due_reminder_v1",
  "category": "UTILITY",
  "feature": "PAYMENT_DUE",
  "variableMappings": {
    "{{1}}": "memberName",
    "{{2}}": "membershipEndDate",
    "{{3}}": "dueAmount",
    "{{4}}": "paymentDueDate"
  }
}
```

---

## 🔄 Message Send Flow

### Automated Send (Cron/Webhook)

```typescript
// 1. Load template
const template = await prisma.whatsAppTemplate.findUnique({
  where: {
    moduleType_templateKey: { moduleType: 'GYM', templateKey: 'PAYMENT_DUE' },
  },
});

// 2. Build context
const context: VariableResolutionContext = {
  module: WhatsAppModule.GYM,
  tenantId: 'tenant-xyz',
  memberId: 'member-123', // ← Required for GYM
};

// 3. Resolve variables
const resolver = new WhatsAppVariableResolver(prisma);
const resolved = await resolver.resolveVariables(
  ['memberName', 'dueAmount'],
  context,
);

// 4. Validate
if (resolved.get('memberName').value === null) {
  // SKIP SEND - required variable missing
  await logger.log({ status: 'BLOCKED', error: 'Member name missing' });
  return { skipped: true };
}

// 5. Replace placeholders
let message = template.text;
message = message.replace('{{1}}', resolved.get('memberName').formatted); // "John Doe"
message = message.replace('{{2}}', resolved.get('dueAmount').formatted); // "₹3,000"

// 6. Send via Meta API
await whatsappSender.send(phone, message);
```

### Manual Send (Admin UI)

```typescript
// Same flow, but:
// - ENTITY/COMPUTED variables auto-fill
// - MANUAL variables render as input fields
// - Send button disabled until all required fields filled

<Button
  disabled={!allRequiredFieldsFilled}
  onClick={handleSend}
>
  Send Message
</Button>
```

---

## ✅ Validation Rules

### Pre-Send Validation Checklist

```typescript
// 1. Module context exists
if (module === GYM && !memberId) {
  throw new Error('Member ID required for GYM module');
}

// 2. Template is ACTIVE
if (template.status !== 'ACTIVE') {
  return { skipped: true, reason: 'Template inactive' };
}

// 3. WhatsApp enabled for tenant
if (!whatsAppSetting.enabled) {
  return { skipped: true, reason: 'WhatsApp disabled' };
}

// 4. Phone number resolved
const phoneConfig = await phoneNumbersService.getPhoneNumberForPurpose(
  tenantId,
  'REMINDER',
);
if (!phoneConfig.isActive) {
  return { skipped: true, reason: 'No active phone number' };
}

// 5. All required variables resolved
const validation = resolver.validateResolution(resolvedVariables);
if (!validation.valid) {
  return {
    skipped: true,
    reason: `Missing: ${validation.missingRequired.join(', ')}`,
  };
}
```

---

## 📊 Example Variable Registrations

### GYM Module

```typescript
export const GYM_VARIABLES = {
  memberName: { sourcePath: 'Member.fullName', required: true },
  membershipEndDate: { sourcePath: 'Member.membershipEndAt', required: true },
  dueAmount: {
    sourcePath: 'Member.feeAmount - Member.paidAmount',
    required: true,
    computed: true,
  },
  gymName: { sourcePath: 'Tenant.name', required: true },
  monthlyFee: { sourcePath: 'Member.monthlyFee', required: false },
};
```

### MOBILE_SALES Module

```typescript
export const MOBILE_SALES_VARIABLES = {
  customerName: { sourcePath: 'Invoice.customerName', required: true },
  invoiceNumber: { sourcePath: 'Invoice.invoiceNumber', required: true },
  invoiceTotalAmount: { sourcePath: 'Invoice.totalAmount', required: true },
  invoicePendingAmount: {
    sourcePath: 'Invoice.totalAmount - sum(Receipt.amount)',
    computed: true,
  },
  shopName: { sourcePath: 'Shop.name', required: true },
  shopPhone: { sourcePath: 'Shop.phone', required: false },
};
```

### MOBILE_REPAIR Module

```typescript
export const MOBILE_REPAIR_VARIABLES = {
  jobNumber: { sourcePath: 'JobCard.jobNumber', required: true },
  jobCustomerName: { sourcePath: 'JobCard.customerName', required: true },
  deviceFullName: {
    sourcePath: 'JobCard.deviceBrand + " " + JobCard.deviceModel',
    computed: true,
  },
  jobStatus: { sourcePath: 'JobCard.status', required: true },
  balanceAmount: {
    sourcePath: 'JobCard.finalCost - JobCard.advancePaid',
    computed: true,
  },
  repairShopName: { sourcePath: 'Shop.name', required: true },
};
```

---

## 🚀 Extensibility

### Adding a New Variable

```typescript
// 1. Add to backend registry (variable-registry.ts)
export const VARIABLE_REGISTRY: Record<string, VariableDefinition> = {
  // ... existing variables

  // NEW VARIABLE
  membershipType: {
    key: 'membershipType',
    label: 'Membership Type',
    module: WhatsAppModule.GYM,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Member.membershipType', // ← Add this field to Prisma schema first
    dataType: VariableDataType.STRING,
    required: false,
  },
};

// 2. If COMPUTED, implement resolver logic (variable-resolver.service.ts)
case 'membershipType':
  // Custom logic here
  break;

// 3. Mirror to frontend registry (lib/variable-registry.ts)
export const VARIABLE_REGISTRY = {
  membershipType: { ... }, // Same definition
};
```

### Adding a New Module

```typescript
// 1. Add to enum (both backend and frontend)
export enum WhatsAppModule {
  GYM = 'GYM',
  MOBILE_SALES = 'MOBILE_SALES',
  MOBILE_REPAIR = 'MOBILE_REPAIR',
  SUPPLIER = 'SUPPLIER', // ← NEW MODULE
}

// 2. Define variables for new module
export const SUPPLIER_VARIABLES = {
  supplierName: { sourcePath: 'Supplier.name', required: true },
  outstandingAmount: { sourcePath: 'Supplier.outstandingAmount', required: true },
  // ...
};

// 3. Add context validation (variable-resolver.service.ts)
case WhatsAppModule.SUPPLIER:
  if (!context.supplierId) {
    return { valid: false, error: 'Supplier ID required' };
  }
  break;

// 4. Seed templates (prisma/seed.ts)
const templates = moduleType === 'SUPPLIER'
  ? [{ templateKey: 'PAYMENT_DUE', ... }]
  : [];
```

---

## 🔒 Safety Features

### 1. **Null Value Handling**

If required variable resolves to `null`, message is **NOT sent**. Logged as `BLOCKED`.

### 2. **Type Safety**

TypeScript ensures only valid variable keys are used.

```typescript
// ✅ Valid
resolved.get('memberName');

// ❌ Compile error
resolved.get('nonExistentVariable');
```

### 3. **Module Isolation**

Cannot use GYM variables in MOBILE_SALES template.

```typescript
// ❌ Runtime error
const template = {
  moduleType: 'MOBILE_SALES',
  variableMappings: { '{{1}}': 'memberName' },
};
// Throws: "Variable memberName belongs to GYM, not MOBILE_SALES"
```

### 4. **Validation Rules**

MANUAL variables respect constraints.

```typescript
customMessage: {
  validationRules: {
    maxLength: 500, // Enforced before send
    pattern: '^[a-zA-Z0-9 ]+$', // Optional regex
  }
}
```

---

## 📝 Frontend Implementation Notes

### Template Variable Mapping UI

```tsx
{
  placeholders.map((placeholder) => (
    <div key={placeholder} className="border p-3 rounded">
      <Label>Placeholder: {placeholder}</Label>
      <Select
        value={variableMappings[placeholder]}
        onValueChange={(key) =>
          setVariableMappings({ ...variableMappings, [placeholder]: key })
        }
      >
        {availableVariables.map((v) => (
          <SelectItem key={v.key} value={v.key}>
            {v.label}
            <Badge className={SOURCE_TYPE_COLORS[v.sourceType]}>
              {SOURCE_TYPE_LABELS[v.sourceType]}
            </Badge>
            {v.required && <span className="text-red-500">*</span>}
          </SelectItem>
        ))}
      </Select>
      {variableDescription && (
        <p className="text-sm text-muted">{variableDescription}</p>
      )}
    </div>
  ));
}
```

### Live Preview

```tsx
<Card className="bg-green-50">
  <CardHeader>
    <CardTitle>📱 WhatsApp Preview</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="whitespace-pre-wrap bg-white p-4 rounded shadow-sm">
      {renderPreview(templateText, variableMappings, sampleData)}
    </div>
  </CardContent>
</Card>
```

---

## 🎯 Meta API Compliance

### Template Approval Strategy

1. **Use consistent variable names** → Meta recognizes patterns
2. **Submit templates with sample values** → "Hello John, your invoice #INV-001..."
3. **Category: UTILITY** (transactional) → Faster approval than MARKETING
4. **Language: en** → Stick to one language per template initially

### Variable Count Limits

- Meta supports **up to 10 variables per template** ({{1}} through {{10}})
- Keep templates simple → 3-5 variables ideal
- Complex messages → Split into multiple templates

---

## 🧪 Testing Checklist

### Backend Tests

```typescript
describe('WhatsAppVariableResolver', () => {
  it('should resolve ENTITY variables from Prisma', async () => {
    const resolved = await resolver.resolveVariables(['memberName'], {
      module: WhatsAppModule.GYM,
      tenantId: 'tenant-1',
      memberId: 'member-1',
    });
    expect(resolved.get('memberName').value).toBe('John Doe');
  });

  it('should compute COMPUTED variables correctly', async () => {
    const resolved = await resolver.resolveVariables(['dueAmount'], context);
    expect(resolved.get('dueAmount').value).toBe(3000); // feeAmount - paidAmount
  });

  it('should reject missing required variables', async () => {
    const validation = resolver.validateResolution(resolvedVariables);
    expect(validation.valid).toBe(false);
    expect(validation.missingRequired).toContain('memberName');
  });
});
```

### Frontend Tests

```typescript
test('extracts placeholders from template text', () => {
  const text = 'Hello {{1}}, your balance is {{2}}';
  const placeholders = extractPlaceholders(text);
  expect(placeholders).toEqual(['{{1}}', '{{2}}']);
});

test('formats currency values correctly', () => {
  expect(formatPreviewValue(5000, VariableDataType.CURRENCY)).toBe('₹5,000');
});
```

---

## 📚 Quick Reference

### Backend Files

- `variable-registry.ts` → Variable definitions
- `variable-resolver.service.ts` → Value extraction logic
- `whatsapp.sender.ts` → Message sending (uses resolver)
- `prisma/seed.ts` → Seed templates per module

### Frontend Files

- `lib/variable-registry.ts` → Frontend variable definitions
- `app/templates/page.tsx` → Template management UI

### Key Concepts

- **Module-scoped templates** → All GYM tenants share same templates
- **Variable mappings** → Placeholder {{1}} → Variable key "memberName"
- **Resolution context** → memberId/invoiceId/jobCardId required per module
- **Validation before send** → Prevents broken messages

---

## ✅ Summary

This system ensures:
✅ **No manual {{1}}, {{2}} typing** → Admins select from registry  
✅ **Type-safe** → TypeScript enforces correct usage  
✅ **Module-isolated** → GYM variables ≠ MOBILE_SALES variables  
✅ **Fail-safe** → Missing required variables block send  
✅ **Extensible** → Add new modules/variables without rewrites  
✅ **Meta-compliant** → Predictable templates for approval

**Result:** Robust WhatsApp messaging that scales across multiple business modules without duplicate logic or broken messages.
