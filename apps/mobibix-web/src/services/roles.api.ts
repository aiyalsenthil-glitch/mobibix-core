import { authenticatedFetch } from "./auth.api";

export interface RoleDto {
  id: string;
  name: string;
  isSystem: boolean; // True for default templates like "Shop Manager"
  description: string;
  permissions: string[];
}

// Temporary mock data to drive the UI until backend is fully hooked up
const MOCK_ROLES: RoleDto[] = [
  {
    id: "system_owner",
    name: "System Owner",
    isSystem: true,
    description: "Full access to all modules and billing. Cannot be modified or deleted.",
    permissions: ["*"],
  },
  {
    id: "shop_manager",
    name: "Shop Manager",
    isSystem: true,
    description: "Can manage sales, inventory, and staff. Cannot view profit margins or export financial data.",
    permissions: [
      "sale.create", "sale.view", "sale.refund",
      "inventory.view", "inventory.adjust", "inventory.create",
      "customer.view", "customer.create"
    ],
  },
  {
    id: "sales_executive",
    name: "Sales Executive",
    isSystem: true,
    description: "Can ring up sales and view basic inventory. No access to adjustments or refunds.",
    permissions: ["sale.create", "sale.view", "inventory.view", "customer.create", "customer.view"],
  }
];

export async function listRoles(): Promise<RoleDto[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));
  return [...MOCK_ROLES];
}

export async function getRole(id: string): Promise<RoleDto> {
  await new Promise(resolve => setTimeout(resolve, 400));
  const role = MOCK_ROLES.find(r => r.id === id);
  if (!role) throw new Error("Role not found");
  return role;
}

export async function createRole(data: Partial<RoleDto>): Promise<RoleDto> {
  await new Promise(resolve => setTimeout(resolve, 600));
  const newRole = {
    id: "custom_" + Date.now(),
    name: data.name || "Custom Role",
    isSystem: false,
    description: data.description || "Custom role created by user",
    permissions: data.permissions || [],
  };
  MOCK_ROLES.push(newRole);
  return newRole;
}

export async function updateRole(id: string, data: Partial<RoleDto>): Promise<RoleDto> {
  await new Promise(resolve => setTimeout(resolve, 600));
  const idx = MOCK_ROLES.findIndex(r => r.id === id);
  if (idx === -1) throw new Error("Role not found");
  if (MOCK_ROLES[idx].isSystem) throw new Error("Cannot modify system roles");
  
  MOCK_ROLES[idx] = { ...MOCK_ROLES[idx], ...data };
  return MOCK_ROLES[idx];
}

export async function deleteRole(id: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 600));
  const idx = MOCK_ROLES.findIndex(r => r.id === id);
  if (idx === -1) throw new Error("Role not found");
  if (MOCK_ROLES[idx].isSystem) throw new Error("Cannot delete system roles");
  
  MOCK_ROLES.splice(idx, 1);
}
