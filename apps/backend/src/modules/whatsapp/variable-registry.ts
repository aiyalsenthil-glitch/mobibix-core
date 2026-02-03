/**
 * WhatsApp Template Variable Registry
 *
 * Single source of truth for all template variables across modules.
 * Variables are DATA BINDINGS to Prisma models, not free text.
 *
 * RULES:
 * - No template variable exists without a registry entry
 * - Variables map to Prisma fields (ENTITY), computed values (COMPUTED), or manual input (MANUAL)
 * - Module isolation: GYM variables never mix with MOBILE_SALES
 * - Validation enforced before message send
 */

export enum WhatsAppModule {
  GYM = 'GYM',
  MOBILE_SHOP = 'MOBILE_SHOP',
  MOBILE_SALES = 'MOBILE_SALES',
  MOBILE_REPAIR = 'MOBILE_REPAIR',
  SUPPLIER = 'SUPPLIER',
}

export enum VariableSourceType {
  ENTITY = 'ENTITY', // Direct Prisma field (Member.fullName)
  COMPUTED = 'COMPUTED', // Calculated value (feeAmount - paidAmount)
  MANUAL = 'MANUAL', // User input at send time
}

export enum VariableDataType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  CURRENCY = 'CURRENCY',
  DATE = 'DATE',
  PHONE = 'PHONE',
}

export interface VariableDefinition {
  key: string; // Unique identifier (memberName, invoiceTotal)
  label: string; // Human-readable label for UI
  module: WhatsAppModule; // Which module owns this variable
  sourceType: VariableSourceType; // How value is obtained
  sourcePath: string; // Prisma path or computation reference
  dataType: VariableDataType; // Data type for formatting
  required: boolean; // Must have value before send
  description?: string; // Help text for admins
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * VARIABLE REGISTRY
 * Add new variables here to extend system
 */
/**
 * SCOPED VARIABLE REGISTRY
 *
 * Variables are now grouped by Module and then by Event.
 * 'GLOBAL' event contains variables available for all events in that module.
 */
export const SCOPED_VARIABLE_REGISTRY: Record<
  string, // WhatsAppModule
  Record<
    string, // EventType (e.g. 'FOLLOW_UP_SCHEDULED', 'MEMBERSHIP_EXPIRY') or 'GLOBAL'
    Record<string, VariableDefinition> // Variable key -> Definition
  >
> = {
  [WhatsAppModule.GYM]: {
    GLOBAL: {
      gymName: {
        key: 'gymName',
        label: 'Gym Name',
        module: WhatsAppModule.GYM,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Tenant.name',
        dataType: VariableDataType.STRING,
        required: true,
      },
      gymPhone: {
        key: 'gymPhone',
        label: 'Gym Phone',
        module: WhatsAppModule.GYM,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Tenant.contactPhone',
        dataType: VariableDataType.PHONE,
        required: false,
      },
    },
    MEMBER_CREATED: {
      memberName: {
        key: 'memberName',
        label: 'Member Name',
        module: WhatsAppModule.GYM,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Member.fullName',
        dataType: VariableDataType.STRING,
        required: true,
        description: 'Full name of the gym member',
      },
      memberPhone: {
        key: 'memberPhone',
        label: 'Member Phone',
        module: WhatsAppModule.GYM,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Member.phone',
        dataType: VariableDataType.PHONE,
        required: true,
      },
      membershipStartDate: {
        key: 'membershipStartDate',
        label: 'Membership Start Date',
        module: WhatsAppModule.GYM,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Member.membershipStartAt',
        dataType: VariableDataType.DATE,
        required: true,
      },
      membershipEndDate: {
        key: 'membershipEndDate',
        label: 'Membership End Date',
        module: WhatsAppModule.GYM,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Member.membershipEndAt',
        dataType: VariableDataType.DATE,
        required: true,
      },
    },
    PAYMENT_DUE: {
      feeAmount: {
        key: 'feeAmount',
        label: 'Total Fee Amount',
        module: WhatsAppModule.GYM,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Member.feeAmount',
        dataType: VariableDataType.CURRENCY,
        required: true,
      },
      paidAmount: {
        key: 'paidAmount',
        label: 'Amount Paid',
        module: WhatsAppModule.GYM,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Member.paidAmount',
        dataType: VariableDataType.CURRENCY,
        required: true,
      },
      dueAmount: {
        key: 'dueAmount',
        label: 'Amount Due',
        module: WhatsAppModule.GYM,
        sourceType: VariableSourceType.COMPUTED,
        sourcePath: 'Member.feeAmount - Member.paidAmount',
        dataType: VariableDataType.CURRENCY,
        required: true,
        description: 'Calculated as Total Fee - Paid Amount',
      },
      paymentDueDate: {
        key: 'paymentDueDate',
        label: 'Payment Due Date',
        module: WhatsAppModule.GYM,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Member.paymentDueDate',
        dataType: VariableDataType.DATE,
        required: false,
      },
    },
    MEMBERSHIP_EXPIRY: {
      membershipEndDate: {
        key: 'membershipEndDate',
        label: 'Membership End Date',
        module: WhatsAppModule.GYM,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Member.membershipEndAt',
        dataType: VariableDataType.DATE,
        required: true,
      },
    },
  },
  [WhatsAppModule.MOBILE_SHOP]: {
    // 🔔 GLOBAL variables available to all MobileShop events
    GLOBAL: {
      shopName: {
        key: 'shopName',
        label: 'Shop Name',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Shop.name',
        dataType: VariableDataType.STRING,
        required: true,
      },
    },

    // 🗓️ CRM / FOLLOW-UP Events
    FOLLOW_UP_SCHEDULED: {
      customerName: {
        key: 'customerName',
        label: 'Customer Name',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Party.name', // Fallback to Party if no specific context, or keep as is for FollowUp if it has customer
        dataType: VariableDataType.STRING,
        required: true,
      },
      followUpPurpose: {
        key: 'followUpPurpose',
        label: 'Follow-up Purpose',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'CustomerFollowUp.purpose', // e.g. "Warranty Expiring"
        dataType: VariableDataType.STRING,
        required: true,
      },
      followUpAt: {
        key: 'followUpAt',
        label: 'Follow-up Time',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'CustomerFollowUp.followUpAt',
        dataType: VariableDataType.DATE,
        required: true,
      },
    },

    FOLLOW_UP_OVERDUE: {
      customerName: {
        key: 'customerName',
        label: 'Customer Name',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Party.name',
        dataType: VariableDataType.STRING,
        required: true,
      },
      daysOverdue: {
        key: 'daysOverdue',
        label: 'Days Overdue',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.COMPUTED,
        sourcePath: 'Date.now() - CustomerFollowUp.followUpAt', // Pseudo-code
        dataType: VariableDataType.NUMBER,
        required: true,
      },
    },

    // 🧾 INVOICE Events
    INVOICE_CREATED: {
      customerName: {
        key: 'customerName',
        label: 'Customer Name',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Invoice.customerName', // FIX: Use Invoice field directly
        dataType: VariableDataType.STRING,
        required: true,
      },
      invoiceNumber: {
        key: 'invoiceNumber',
        label: 'Invoice Number',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Invoice.invoiceNumber',
        dataType: VariableDataType.STRING,
        required: true,
      },
      invoiceTotalAmount: {
        key: 'invoiceTotalAmount',
        label: 'Total Amount',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Invoice.totalAmount',
        dataType: VariableDataType.CURRENCY,
        required: true,
      },
    },

    PAYMENT_PENDING: {
      customerName: {
        key: 'customerName',
        label: 'Customer Name',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Invoice.customerName', // FIX: Use Invoice field directly
        dataType: VariableDataType.STRING,
        required: true,
      },
      invoiceNumber: {
        key: 'invoiceNumber',
        label: 'Invoice Number',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Invoice.invoiceNumber',
        dataType: VariableDataType.STRING,
        required: true,
      },
      invoicePendingAmount: {
        key: 'invoicePendingAmount',
        label: 'Pending Amount',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.COMPUTED,
        sourcePath: 'Invoice.totalAmount - Receipts.sum',
        dataType: VariableDataType.CURRENCY,
        required: true,
        description: 'Calculated as Total Amount - Total Paid Receipts',
      },
    },

    // 🔧 JOB CARD Events
    JOB_CREATED: {
      customerName: {
        key: 'customerName',
        label: 'Customer Name',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.customerName', // FIX: Use JobCard field directly
        dataType: VariableDataType.STRING,
        required: true,
      },
      jobNumber: {
        key: 'jobNumber',
        label: 'Job Number',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.jobNumber',
        dataType: VariableDataType.STRING,
        required: true,
      },
      deviceModel: {
        key: 'deviceModel',
        label: 'Device Model',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.deviceModel',
        dataType: VariableDataType.STRING,
        required: true,
      },
    },

    JOB_READY: {
      customerName: {
        key: 'customerName',
        label: 'Customer Name',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.customerName', // FIX: Use JobCard field directly
        dataType: VariableDataType.STRING,
        required: true,
      },
      shopName: {
        key: 'shopName',
        label: 'Shop Name',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Shop.name',
        dataType: VariableDataType.STRING,
        required: true,
      },
      jobNumber: {
        key: 'jobNumber',
        label: 'Job Number',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.jobNumber',
        dataType: VariableDataType.STRING,
        required: true,
      },
      jobCardNumber: {
        key: 'jobCardNumber',
        label: 'Job Card Number',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.jobNumber', // Alias for jobNumber
        dataType: VariableDataType.STRING,
        required: true,
      },
      deviceModel: {
        key: 'deviceModel',
        label: 'Device Model',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.deviceModel',
        dataType: VariableDataType.STRING,
        required: true,
      },
    },

    JOB_COMPLETED: {
      customerName: {
        key: 'customerName',
        label: 'Customer Name',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.customerName', // FIX: Use JobCard field directly
        dataType: VariableDataType.STRING,
        required: true,
      },
      jobNumber: {
        key: 'jobNumber',
        label: 'Job Number',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.jobNumber',
        dataType: VariableDataType.STRING,
        required: true,
      },
      finalCost: {
        key: 'finalCost',
        label: 'Final Cost',
        module: WhatsAppModule.MOBILE_SHOP,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.finalCost',
        dataType: VariableDataType.CURRENCY,
        required: true,
      },
    },
  },
  [WhatsAppModule.MOBILE_REPAIR]: {
    GLOBAL: {
      repairShopName: {
        key: 'repairShopName',
        label: 'Shop Name',
        module: WhatsAppModule.MOBILE_REPAIR,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'Shop.name',
        dataType: VariableDataType.STRING,
        required: true,
      },
    },
    JOB_CREATED: {
      jobNumber: {
        key: 'jobNumber',
        label: 'Job Card Number',
        module: WhatsAppModule.MOBILE_REPAIR,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.jobNumber',
        dataType: VariableDataType.STRING,
        required: true,
      },
      jobCustomerName: {
        key: 'jobCustomerName',
        label: 'Customer Name',
        module: WhatsAppModule.MOBILE_REPAIR,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.customerName',
        dataType: VariableDataType.STRING,
        required: true,
      },
      deviceFullName: {
        key: 'deviceFullName',
        label: 'Full Device Name',
        module: WhatsAppModule.MOBILE_REPAIR,
        sourceType: VariableSourceType.COMPUTED,
        sourcePath: 'JobCard.deviceBrand + " " + JobCard.deviceModel',
        dataType: VariableDataType.STRING,
        required: true,
      },
    },
    JOB_COMPLETED: {
      jobNumber: {
        key: 'jobNumber',
        label: 'Job Card Number',
        module: WhatsAppModule.MOBILE_REPAIR,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.jobNumber',
        dataType: VariableDataType.STRING,
        required: true,
      },
      jobStatus: {
        key: 'jobStatus',
        label: 'Job Status',
        module: WhatsAppModule.MOBILE_REPAIR,
        sourceType: VariableSourceType.ENTITY,
        sourcePath: 'JobCard.status',
        dataType: VariableDataType.STRING,
        required: true,
      },
    },
  },
  MANUAL: {
    GLOBAL: {
      customMessage: {
        key: 'customMessage',
        label: 'Custom Message',
        module: WhatsAppModule.GYM,
        sourceType: VariableSourceType.MANUAL,
        sourcePath: 'user_input',
        dataType: VariableDataType.STRING,
        required: false,
        validationRules: { maxLength: 500 },
      },
    },
  },
};

/**
 * FLAT REGISTRY (Backward Compatibility)
 * A flattened view of all variables for quick lookup by key.
 */
export const VARIABLE_REGISTRY: Record<string, VariableDefinition> = {};

// Auto-populate flat registry from scoped registry
Object.values(SCOPED_VARIABLE_REGISTRY).forEach((events) => {
  Object.values(events).forEach((vars) => {
    Object.assign(VARIABLE_REGISTRY, vars);
  });
});

/**
 * Get all variables for a specific module
 */
export function getVariablesByModule(
  module: WhatsAppModule,
): VariableDefinition[] {
  const moduleScope = SCOPED_VARIABLE_REGISTRY[module] || {};
  const globalManual = SCOPED_VARIABLE_REGISTRY.MANUAL?.GLOBAL || {};

  const allVars: VariableDefinition[] = [];

  // Add all variables from all events in this module
  Object.values(moduleScope).forEach((eventVars) => {
    allVars.push(...Object.values(eventVars));
  });

  // Add global manual variables
  allVars.push(...Object.values(globalManual));

  // Deduplicate by key
  return Array.from(new Map(allVars.map((v) => [v.key, v])).values());
}

/**
 * Get variables allowed for a specific context (Module + Event)
 */
export function getVariablesByContext(
  module: WhatsAppModule,
  eventType: string,
): VariableDefinition[] {
  const moduleScope = SCOPED_VARIABLE_REGISTRY[module] || {};
  const globalVars = moduleScope.GLOBAL || {};
  const eventVars = moduleScope[eventType] || {};
  const globalManual = SCOPED_VARIABLE_REGISTRY.MANUAL?.GLOBAL || {};

  const allowedVars = {
    ...globalVars,
    ...eventVars,
    ...globalManual,
  };

  return Object.values(allowedVars);
}

/**
 * Get variable definition by key
 */
export function getVariableByKey(key: string): VariableDefinition | undefined {
  return VARIABLE_REGISTRY[key];
}

/**
 * Validate if all required variables in a template are mapped
 */
export function validateTemplateVariables(
  module: WhatsAppModule,
  variableMappings: Record<string, string>, // placeholder -> variableKey
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const moduleVariables = getVariablesByModule(module);

  for (const [placeholder, variableKey] of Object.entries(variableMappings)) {
    const variable = getVariableByKey(variableKey);

    if (!variable) {
      errors.push(`Invalid variable key: ${variableKey} for ${placeholder}`);
      continue;
    }

    if (
      variable.module !== module &&
      variable.sourceType !== VariableSourceType.MANUAL
    ) {
      errors.push(
        `Variable ${variableKey} belongs to ${variable.module}, not ${module}`,
      );
    }

    if (variable.required && !variableKey) {
      errors.push(`Required variable ${placeholder} is not mapped`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format value based on data type
 */
export function formatVariableValue(
  value: any,
  dataType: VariableDataType,
): string {
  if (value === null || value === undefined) return '';

  switch (dataType) {
    case VariableDataType.CURRENCY:
      return `₹${Number(value).toLocaleString('en-IN')}`;

    case VariableDataType.DATE:
      const date = new Date(value);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

    case VariableDataType.PHONE:
      const phone = String(value);
      if (phone.startsWith('+91')) return phone;
      return `+91${phone}`;

    case VariableDataType.NUMBER:
      return String(value);

    case VariableDataType.STRING:
    default:
      return String(value);
  }
}
