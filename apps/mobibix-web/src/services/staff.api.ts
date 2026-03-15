import { authenticatedFetch, extractData } from "./auth.api";

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
  roleId?: string;
  branchIds?: string[];
}


interface BackendStaff {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  isSystemOwner?: boolean;
  createdAt: string;
}

interface BackendInvite {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
}

/**
 * List all staff members (Active + Invited)
 * Returns a unified list for UI
 */
export async function listStaff(): Promise<Staff[]> {
  // 1. Fetch active staff
  const staffResponse = await authenticatedFetch("/staff");
  const activeStaffData = staffResponse.ok ? await extractData<BackendStaff[] | { data: BackendStaff[] }>(staffResponse) : [];
  const activeStaff = Array.isArray(activeStaffData) ? activeStaffData : (activeStaffData.data || []);

  // 2. Fetch invited staff
  const invitesResponse = await authenticatedFetch("/staff/invites");
  const invitesData = invitesResponse.ok ? await extractData<BackendInvite[] | { data: BackendInvite[] }>(invitesResponse) : [];
  const invitedStaff = Array.isArray(invitesData) ? invitesData : (invitesData.data || []);

   // 3. Merge and Normalize
   const normalizedActive: Staff[] = activeStaff.map((s) => ({
     id: s.id,
     email: s.email,
     name: s.fullName,
     phone: s.phone,
     role: s.role,
     isSystemOwner: s.isSystemOwner ?? false,
     status: "ACTIVE",
     joinDate: s.createdAt || new Date().toISOString(),
   }));

   const normalizedInvites: Staff[] = invitedStaff.map((i) => ({
     id: i.id,
     email: i.email,
     name: i.name,
     phone: i.phone,
     role: i.role,
     isSystemOwner: false,
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
    const err = await extractData(response);
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
    const err = await extractData(response);
    throw new Error(err.message || "Failed to remove staff");
  }
}

/**
 * Accept a staff invitation
 */
export async function acceptStaffInvite(token: string): Promise<any> {
  const response = await authenticatedFetch("/staff/invite/accept", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const err = await extractData(response);
    throw new Error(err.message || "Failed to accept invite");
  }

  return extractData(response);
}

/**
 * Reject a staff invitation
 */
export async function rejectStaffInvite(token: string): Promise<void> {
  const response = await authenticatedFetch("/staff/invite/reject", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const err = await extractData(response);
    throw new Error(err.message || "Failed to reject invite");
  }
}
