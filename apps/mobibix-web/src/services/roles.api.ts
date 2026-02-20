import { authenticatedFetch } from "./auth.api";

export interface RoleDto {
  id: string;
  name: string;
  isSystem: boolean; // True for default templates like "Shop Manager"
  description: string;
  permissions: string[];
}

export async function listRoles(): Promise<RoleDto[]> {
  const response = await authenticatedFetch("/permissions/roles");
  if (!response.ok) throw new Error("Failed to fetch roles");
  return response.json();
}

export async function getRole(id: string): Promise<RoleDto> {
  const response = await authenticatedFetch(`/permissions/roles/${id}`);
  if (!response.ok) throw new Error("Failed to fetch role details");
  return response.json();
}

export async function createRole(data: Partial<RoleDto>): Promise<RoleDto> {
  const response = await authenticatedFetch("/permissions/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      permissions: data.permissions,
    }),
  });
  if (!response.ok) throw new Error("Failed to create role");
  return response.json();
}

export async function updateRole(id: string, data: Partial<RoleDto>): Promise<RoleDto> {
  const response = await authenticatedFetch(`/permissions/roles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      permissions: data.permissions,
    }),
  });
  if (!response.ok) throw new Error("Failed to update role");
  return response.json();
}

export async function deleteRole(id: string): Promise<void> {
  const response = await authenticatedFetch(`/permissions/roles/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete role");
}

