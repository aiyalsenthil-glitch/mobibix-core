import { authenticatedFetch } from "./auth.api";

export interface Staff {
  id: string; // user.id or invite.id
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  isSystemOwner: boolean;
  status: "ACTIVE" | "INVITED";
  joinDate: string; // createdAt
}

export interface AddStaffDto {
  email: string;
  name: string;
  phone?: string;
  shopId?: string; // Legacy field
  roleId: string;
  branchIds: string[];
}


/**
 * List all staff members (Active + Invited)
 * Returns a unified list for UI
 */
export async function listStaff(): Promise<Staff[]> {
  // 1. Fetch active staff
  const staffResponse = await authenticatedFetch("/staff");
  const activeStaffData = staffResponse.ok ? await staffResponse.json() : [];
  const activeStaff = Array.isArray(activeStaffData) ? activeStaffData : (activeStaffData.data || []);

  // 2. Fetch invited staff
  const invitesResponse = await authenticatedFetch("/staff/invites");
  const invitesData = invitesResponse.ok ? await invitesResponse.json() : [];
  const invitedStaff = Array.isArray(invitesData) ? invitesData : (invitesData.data || []);

  // 3. Merge and Normalize
  const normalizedActive = activeStaff.map((s: any) => ({
    id: s.id,
    email: s.email,
    name: s.fullName,
    phone: s.phone,
    role: s.role,
    isSystemOwner: s.isSystemOwner ?? false,
    status: "ACTIVE",
    joinDate: s.createdAt || new Date().toISOString(), // Fallback if missing
  }));

  const normalizedInvites = invitedStaff.map((i: any) => ({
    id: i.id, // Invite ID (needed for revoke)
    email: i.email,
    name: i.name,
    phone: i.phone,
    role: i.role,
    isSystemOwner: false, // Invites are never system owners
    status: "INVITED",
    joinDate: i.createdAt,
  }));

  return [...normalizedActive, ...normalizedInvites];
}

/**
 * Add (Invite) a new staff member
 */
export async function addStaff(dto: AddStaffDto): Promise<void> {
  const response = await authenticatedFetch("/staff/invite", {
    method: "POST",
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Failed to add staff");
  }
}

/**
 * Remove a staff member or revoke an invite
 */
export async function removeStaff(staffId: string, status: "ACTIVE" | "INVITED"): Promise<void> {
  const endpoint = status === "ACTIVE" 
    ? `/staff/${staffId}` 
    : `/staff/invite/${staffId}`;

  const response = await authenticatedFetch(endpoint, {
    method: "DELETE",
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Failed to remove staff");
  }
}
