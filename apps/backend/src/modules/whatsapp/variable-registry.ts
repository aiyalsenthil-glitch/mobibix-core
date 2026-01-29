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
export const VARIABLE_REGISTRY: Record<string, VariableDefinition> = {
  // ═══════════════════════════════════════════════════════════
  // GYM MODULE VARIABLES
  // ═══════════════════════════════════════════════════════════
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
  monthlyFee: {
    key: 'monthlyFee',
    label: 'Monthly Fee',
    module: WhatsAppModule.GYM,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Member.monthlyFee',
    dataType: VariableDataType.CURRENCY,
    required: false,
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

  // ═══════════════════════════════════════════════════════════
  // MOBILE SALES MODULE VARIABLES
  // ═══════════════════════════════════════════════════════════
  customerName: {
    key: 'customerName',
    label: 'Customer Name',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Invoice.customerName',
    dataType: VariableDataType.STRING,
    required: true,
  },
  customerPhone: {
    key: 'customerPhone',
    label: 'Customer Phone',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Invoice.customerPhone',
    dataType: VariableDataType.PHONE,
    required: true,
  },
  invoiceNumber: {
    key: 'invoiceNumber',
    label: 'Invoice Number',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Invoice.invoiceNumber',
    dataType: VariableDataType.STRING,
    required: true,
  },
  invoiceDate: {
    key: 'invoiceDate',
    label: 'Invoice Date',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Invoice.invoiceDate',
    dataType: VariableDataType.DATE,
    required: true,
  },
  invoiceSubTotal: {
    key: 'invoiceSubTotal',
    label: 'Sub Total',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Invoice.subTotal',
    dataType: VariableDataType.CURRENCY,
    required: true,
  },
  invoiceGstAmount: {
    key: 'invoiceGstAmount',
    label: 'GST Amount',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Invoice.gstAmount',
    dataType: VariableDataType.CURRENCY,
    required: false,
  },
  invoiceTotalAmount: {
    key: 'invoiceTotalAmount',
    label: 'Total Amount',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Invoice.totalAmount',
    dataType: VariableDataType.CURRENCY,
    required: true,
  },
  invoicePaidAmount: {
    key: 'invoicePaidAmount',
    label: 'Amount Paid',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.COMPUTED,
    sourcePath: 'sum(Receipt.amount) where linkedInvoiceId = Invoice.id',
    dataType: VariableDataType.CURRENCY,
    required: false,
    description: 'Total of all linked receipt amounts',
  },
  invoicePendingAmount: {
    key: 'invoicePendingAmount',
    label: 'Pending Amount',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.COMPUTED,
    sourcePath: 'Invoice.totalAmount - sum(Receipt.amount)',
    dataType: VariableDataType.CURRENCY,
    required: false,
    description: 'Total - Paid (for credit invoices)',
  },
  paymentMode: {
    key: 'paymentMode',
    label: 'Payment Mode',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Invoice.paymentMode',
    dataType: VariableDataType.STRING,
    required: false,
  },
  shopName: {
    key: 'shopName',
    label: 'Shop Name',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Shop.name',
    dataType: VariableDataType.STRING,
    required: true,
  },
  shopPhone: {
    key: 'shopPhone',
    label: 'Shop Phone',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Shop.phone',
    dataType: VariableDataType.PHONE,
    required: false,
  },
  shopAddress: {
    key: 'shopAddress',
    label: 'Shop Address',
    module: WhatsAppModule.MOBILE_SALES,
    sourceType: VariableSourceType.COMPUTED,
    sourcePath: 'Shop.addressLine1 + Shop.city',
    dataType: VariableDataType.STRING,
    required: false,
  },

  // ═══════════════════════════════════════════════════════════
  // MOBILE REPAIR MODULE VARIABLES
  // ═══════════════════════════════════════════════════════════
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
  jobCustomerPhone: {
    key: 'jobCustomerPhone',
    label: 'Customer Phone',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'JobCard.customerPhone',
    dataType: VariableDataType.PHONE,
    required: true,
  },
  deviceType: {
    key: 'deviceType',
    label: 'Device Type',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'JobCard.deviceType',
    dataType: VariableDataType.STRING,
    required: true,
  },
  deviceBrand: {
    key: 'deviceBrand',
    label: 'Device Brand',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'JobCard.deviceBrand',
    dataType: VariableDataType.STRING,
    required: true,
  },
  deviceModel: {
    key: 'deviceModel',
    label: 'Device Model',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'JobCard.deviceModel',
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
    description: 'Brand and Model combined (e.g., Samsung Galaxy S21)',
  },
  deviceSerial: {
    key: 'deviceSerial',
    label: 'Device Serial/IMEI',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'JobCard.deviceSerial',
    dataType: VariableDataType.STRING,
    required: false,
  },
  customerComplaint: {
    key: 'customerComplaint',
    label: 'Customer Complaint',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'JobCard.customerComplaint',
    dataType: VariableDataType.STRING,
    required: false,
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
  estimatedCost: {
    key: 'estimatedCost',
    label: 'Estimated Cost',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'JobCard.estimatedCost',
    dataType: VariableDataType.CURRENCY,
    required: false,
  },
  finalCost: {
    key: 'finalCost',
    label: 'Final Cost',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'JobCard.finalCost',
    dataType: VariableDataType.CURRENCY,
    required: false,
  },
  advancePaid: {
    key: 'advancePaid',
    label: 'Advance Paid',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'JobCard.advancePaid',
    dataType: VariableDataType.CURRENCY,
    required: false,
  },
  balanceAmount: {
    key: 'balanceAmount',
    label: 'Balance Amount',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.COMPUTED,
    sourcePath:
      '(JobCard.finalCost || JobCard.estimatedCost) - JobCard.advancePaid',
    dataType: VariableDataType.CURRENCY,
    required: false,
    description: 'Final/Estimated Cost minus Advance',
  },
  expectedDelivery: {
    key: 'expectedDelivery',
    label: 'Expected Delivery Date',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'JobCard.estimatedDelivery',
    dataType: VariableDataType.DATE,
    required: false,
  },
  repairShopName: {
    key: 'repairShopName',
    label: 'Shop Name',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Shop.name',
    dataType: VariableDataType.STRING,
    required: true,
  },
  repairShopPhone: {
    key: 'repairShopPhone',
    label: 'Shop Phone',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'Shop.phone',
    dataType: VariableDataType.PHONE,
    required: false,
  },
  warrantyDuration: {
    key: 'warrantyDuration',
    label: 'Warranty Duration (days)',
    module: WhatsAppModule.MOBILE_REPAIR,
    sourceType: VariableSourceType.ENTITY,
    sourcePath: 'JobCard.warrantyDuration',
    dataType: VariableDataType.NUMBER,
    required: false,
  },

  // ═══════════════════════════════════════════════════════════
  // MANUAL VARIABLES (For custom messages)
  // ═══════════════════════════════════════════════════════════
  customMessage: {
    key: 'customMessage',
    label: 'Custom Message',
    module: WhatsAppModule.GYM, // Can be used across modules
    sourceType: VariableSourceType.MANUAL,
    sourcePath: 'user_input',
    dataType: VariableDataType.STRING,
    required: false,
    description: 'Free text input by admin at send time',
    validationRules: {
      maxLength: 500,
    },
  },
  customDate: {
    key: 'customDate',
    label: 'Custom Date',
    module: WhatsAppModule.GYM,
    sourceType: VariableSourceType.MANUAL,
    sourcePath: 'user_input',
    dataType: VariableDataType.DATE,
    required: false,
  },
  customAmount: {
    key: 'customAmount',
    label: 'Custom Amount',
    module: WhatsAppModule.GYM,
    sourceType: VariableSourceType.MANUAL,
    sourcePath: 'user_input',
    dataType: VariableDataType.CURRENCY,
    required: false,
    validationRules: {
      min: 0,
    },
  },
};

/**
 * Get all variables for a specific module
 */
export function getVariablesByModule(
  module: WhatsAppModule,
): VariableDefinition[] {
  return Object.values(VARIABLE_REGISTRY).filter(
    (v) => v.module === module || v.sourceType === VariableSourceType.MANUAL,
  );
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
