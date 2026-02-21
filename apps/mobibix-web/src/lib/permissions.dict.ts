export interface WebPermissionDef {
  actionId: string;
  uiLabel: string;
  description: string;
  isSensitive: boolean;
}

export interface WebResourceGroup {
  resourceId: string;
  uiLabel: string;
  permissions: WebPermissionDef[];
}

export interface WebModuleGroup {
  moduleId: "MOBILE_SHOP" | "GYM" | "CORE";
  uiLabel: string;
  resources: WebResourceGroup[];
}

export const PERMISSION_DICTIONARY: WebModuleGroup[] = [
  {
    moduleId: "MOBILE_SHOP",
    uiLabel: "Mobile Shop",
    resources: [
      {
        resourceId: "sales",
        uiLabel: "Sales & Billing",
        permissions: [
          {
            actionId: "mobile_shop.sale.create",
            uiLabel: "Ring up Sales",
            description: "Create new invoices and perform checkout.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.sale.view",
            uiLabel: "View Sales",
            description: "View past sales and invoices.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.sale.view_profit",
            uiLabel: "View Profit Margin",
            description: "See the actual cost of goods and profit made per sale.",
            isSensitive: true,
          },
          {
            actionId: "mobile_shop.sale.refund",
            uiLabel: "Refund Invoices",
            description: "Process returns and refund money to customers.",
            isSensitive: true,
          }
        ]
      },
      {
        resourceId: "inventory",
        uiLabel: "Inventory Management",
        permissions: [
          {
            actionId: "mobile_shop.inventory.view",
            uiLabel: "View Stock",
            description: "See what items are currently in stock.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.inventory.create",
            uiLabel: "Add New Items",
            description: "Create new product entries in the catalog.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.inventory.adjust",
            uiLabel: "Adjust Stock Levels",
            description: "Manually change inventory quantities without a sale.",
            isSensitive: false,
          }
        ]
      },
      {
        resourceId: "customers",
        uiLabel: "Customer CRM",
        permissions: [
          {
            actionId: "mobile_shop.customer.view",
            uiLabel: "View Customers",
            description: "See client database and purchase history.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.customer.create",
            uiLabel: "Add Customers",
            description: "Register new customers into the database.",
            isSensitive: false,
          }
        ]
      }
    ]
  },
  {
    moduleId: "GYM",
    uiLabel: "GymPilot",
    resources: [
      {
        resourceId: "members",
        uiLabel: "Members & Attendance",
        permissions: [
          {
            actionId: "gym.member.view",
            uiLabel: "View Members",
            description: "See active gym memberships.",
            isSensitive: false,
          },
          {
            actionId: "gym.member.view_financials",
            uiLabel: "View Member Payments",
            description: "See payment history and pending dues for members.",
            isSensitive: false,
          },
          {
            actionId: "gym.attendance.mark",
            uiLabel: "Mark Attendance",
            description: "Check-in members as they arrive at the gym.",
            isSensitive: false,
          }
        ]
      }
    ]
  },
  {
    moduleId: "CORE",
    uiLabel: "Core Admin & Finance",
    resources: [
      {
        resourceId: "finance",
        uiLabel: "Business Finance",
        permissions: [
          {
            actionId: "core.report.view_financials",
            uiLabel: "View Financial Reports",
            description: "See daily totals, outstanding amounts, and P&L.",
            isSensitive: true,
          },
          {
            actionId: "core.report.export",
            uiLabel: "Export CSV Reports",
            description: "Download bulk data of your business.",
            isSensitive: true,
          }
        ]
      },
      {
        resourceId: "admin",
        uiLabel: "Security & Approvals",
        permissions: [
          {
            actionId: "core.approval.override",
            uiLabel: "Manager Override",
            description: "Approve actions that are blocked for normal staff (e.g., large discounts).",
            isSensitive: true,
          }
        ]
      }
    ]
  }
];
