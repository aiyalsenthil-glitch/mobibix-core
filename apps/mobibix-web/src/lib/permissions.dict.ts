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
    uiLabel: "MobiBix (Mobile Shop ERP)",
    resources: [
      {
        resourceId: "sale",
        uiLabel: "Sales & Invoicing",
        permissions: [
          {
            actionId: "mobile_shop.sale.create",
            uiLabel: "Create Invoice",
            description: "Ring up sales and generate invoices.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.sale.view",
            uiLabel: "View Invoices",
            description: "Browse and search past transactions.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.sale.edit",
            uiLabel: "Edit Invoices",
            description: "Modify existing sales records.",
            isSensitive: true,
          },
          {
            actionId: "mobile_shop.sale.refund",
            uiLabel: "Refund Invoices",
            description: "Process returns and refunds.",
            isSensitive: true,
          }
        ]
      },
      {
        resourceId: "inventory",
        uiLabel: "Stock & Inventory",
        permissions: [
          {
            actionId: "mobile_shop.inventory.view",
            uiLabel: "View Stock",
            description: "Check current inventory levels.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.inventory.create",
            uiLabel: "Add Products",
            description: "Create new items in the catalog.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.inventory.adjust",
            uiLabel: "Adjust Inventory",
            description: "Manually correct stock counts.",
            isSensitive: true,
          }
        ]
      },
      {
        resourceId: "jobcard",
        uiLabel: "Repairs (Job Cards)",
        permissions: [
          {
            actionId: "mobile_shop.jobcard.create",
            uiLabel: "Create Job Card",
            description: "Start new repair tickets.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.jobcard.view",
            uiLabel: "View Job Cards",
            description: "Track service history.",
            isSensitive: false,
          },
          {
            actionId: "mobile_shop.jobcard.update_status",
            uiLabel: "Update Status",
            description: "Move repairs through workflow.",
            isSensitive: false,
          }
        ]
      },
      {
         resourceId: "customer",
         uiLabel: "Customers",
         permissions: [
            {
               actionId: "mobile_shop.customer.view",
               uiLabel: "View Customers",
               description: "Access client contact list.",
               isSensitive: false
            },
            {
               actionId: "mobile_shop.customer.create",
               uiLabel: "Add Customer",
               description: "Register new clients.",
               isSensitive: false
            }
         ]
      }
    ]
  },
  {
    moduleId: "GYM",
    uiLabel: "GymPilot (Gym Management)",
    resources: [
      {
        resourceId: "member",
        uiLabel: "Members",
        permissions: [
          {
            actionId: "gym.member.create",
            uiLabel: "Register Member",
            description: "Add new gym members.",
            isSensitive: false,
          },
          {
            actionId: "gym.member.view",
            uiLabel: "View Members",
            description: "View active membership list.",
            isSensitive: false,
          }
        ]
      },
      {
         resourceId: "attendance",
         uiLabel: "Attendance",
         permissions: [
            {
               actionId: "gym.attendance.mark",
               uiLabel: "Mark Attendance",
               description: "Log daily gym visits.",
               isSensitive: false
            }
         ]
      }
    ]
  },
  {
    moduleId: "CORE",
    uiLabel: "Core System",
    resources: [
      {
        resourceId: "dashboard",
        uiLabel: "Dashboard",
        permissions: [
          {
            actionId: "core.dashboard.view",
            uiLabel: "View Dashboard",
            description: "See performance snapshots.",
            isSensitive: false,
          }
        ]
      },
      {
        resourceId: "report",
        uiLabel: "Analytics & Reports",
        permissions: [
          {
            actionId: "core.report.view",
            uiLabel: "View Reports",
            description: "Access business-wide reports.",
            isSensitive: false,
          },
          {
            actionId: "core.report.export",
            uiLabel: "Export Data",
            description: "Download bulk CSV records.",
            isSensitive: true,
          }
        ]
      },
      {
        resourceId: "settings",
        uiLabel: "Administration",
        permissions: [
          {
            actionId: "core.settings.manage",
            uiLabel: "Manage Settings",
            description: "Configure biz details and tax.",
            isSensitive: true,
          }
        ]
      },
      {
        resourceId: "staff",
        uiLabel: "Staff & RBAC",
        permissions: [
          {
            actionId: "core.staff.manage",
            uiLabel: "Manage Team",
            description: "Add members and assign roles.",
            isSensitive: true,
          }
        ]
      }
    ]
  }
];
