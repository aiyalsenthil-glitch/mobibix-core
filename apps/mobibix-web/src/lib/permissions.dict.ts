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
            actionId: "mobile_shop.sales.sale.create",
            uiLabel: "Ring up Sales",
            description: "Create new invoices and perform checkout.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.sales.sale.view",
            uiLabel: "View Sales",
            description: "View past sales and invoices.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.sales.sale.view_profit",
            uiLabel: "View Profit Margin",
            description: "See the actual cost of goods and profit made per sale.",
            isSensitive: true,
          },
          {
            actionId: "mobile_shop.sales.sale.refund",
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
            actionId: "mobile_shop.inventory.inventory.view",
            uiLabel: "View Stock",
            description: "See what items are currently in stock.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.inventory.inventory.create",
            uiLabel: "Add New Items",
            description: "Create new product entries in the catalog.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.inventory.inventory.adjust",
            uiLabel: "Adjust Stock Levels",
            description: "Manually change inventory quantities without a sale.",
            isSensitive: true,
          }
        ]
      },
      {
        resourceId: "job_cards",
        uiLabel: "Job Cards",
        permissions: [
          {
            actionId: "mobile_shop.job_cards.job_card.create",
            uiLabel: "Create Job Cards",
            description: "Register new repair jobs / service requests.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.job_cards.job_card.view",
            uiLabel: "View Jobs",
            description: "Track status of ongoing service tasks.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.job_cards.job_card.edit",
            uiLabel: "Update Job Status",
            description: "Mark jobs as ready, delivered, or canceled.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.job_cards.job_card.delete",
            uiLabel: "Delete Records",
            description: "Remove job card entries permanently.",
            isSensitive: true,
          }
        ]
      },
      {
        resourceId: "quotations",
        uiLabel: "Quotations",
        permissions: [
          {
            actionId: "mobile_shop.quotations.quotation.create",
            uiLabel: "Generate Quotations",
            description: "Create price estimates for customers.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.quotations.quotation.view",
            uiLabel: "View Estimates",
            description: "Review past quotes and convert them to sales.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.quotations.quotation.edit",
            uiLabel: "Modify Quotes",
            description: "Update items or pricing in existing estimates.",
            isSensitive: false,
          }
        ]
      },
      {
        resourceId: "customers",
        uiLabel: "Customer CRM",
        permissions: [
          {
            actionId: "mobile_shop.customers.customer.view",
            uiLabel: "View Customers",
            description: "See client database and purchase history.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.customers.customer.create",
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
            actionId: "gym.members.member.view",
            uiLabel: "View Members",
            description: "See active gym memberships.",
            isSensitive: false,
          },
          {
            actionId: "gym.members.member.view_financials",
            uiLabel: "View Member Payments",
            description: "See payment history and pending dues for members.",
            isSensitive: false,
          },
          {
            actionId: "gym.members.attendance.mark",
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
        resourceId: "dashboard",
        uiLabel: "Control Center",
        permissions: [
          {
            actionId: "core.dashboard.dashboard.view",
            uiLabel: "View Dashboard",
            description: "See high level business overview.",
            isSensitive: false,
          }
        ]
      },
      {
        resourceId: "finance",
        uiLabel: "Business Finance",
        permissions: [
          {
            actionId: "core.finance.report.view_financials",
            uiLabel: "View Financial Reports",
            description: "See daily totals, outstanding amounts, and P&L.",
            isSensitive: true,
          },
          {
            actionId: "core.finance.report.export",
            uiLabel: "Export CSV Reports",
            description: "Download bulk data of your business.",
            isSensitive: true,
          }
        ]
      },
      {
        resourceId: "admin",
        uiLabel: "Security & Settings",
        permissions: [
          {
            actionId: "core.admin.shop.manage",
            uiLabel: "Manage Shop Profile",
            description: "Change business details, address, and VAT settings.",
            isSensitive: true,
          },
          {
            actionId: "core.admin.staff.manage",
            uiLabel: "Staff & RBAC",
            description: "Invite employees and manage their permissions.",
            isSensitive: true,
          },
          {
            actionId: "core.admin.approval.override",
            uiLabel: "Manager Override",
            description: "Approve actions that are blocked for normal staff (e.g., large discounts).",
            isSensitive: true,
          }
        ]
      }
    ]
  }
];
