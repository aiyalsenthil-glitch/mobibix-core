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


/**
 * List all staff members (Active + Invited)
 * Returns a unified list for UI
 */
export async function listStaff(): Promise<Staff[]> {
  // 1. Fetch active staff
  const staffResponse = await authenticatedFetch("/staff");
  const activeStaffData = staffResponse.ok ? await extractData(staffResponse) : [];
  const activeStaff = Array.isArray(activeStaffData) ? activeStaffData : (activeStaffData.data || []);

  // 2. Fetch invited staff
  const invitesResponse = await authenticatedFetch("/staff/invites");
  const invitesData = invitesResponse.ok ? await extractData(invitesResponse) : [];
  const invitedStaff = Array.isArray(invitesData) ? invitesData : (invitesData.data || []);

   // 3. Merge and Normalize
   const normalizedActive = activeStaff.map((s: Record<string, unknown>) => ({
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     id: s.id,
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     email: s.email,
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     name: s.fullName,
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     phone: s.phone,
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     role: s.role,
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     isSystemOwner: s.isSystemOwner ?? false,
     status: "ACTIVE",
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     joinDate: s.createdAt || new Date().toISOString(), // Fallback if missing
   }));

   const normalizedInvites = invitedStaff.map((i: Record<string, unknown>) => ({
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     id: i.id, // Invite ID (needed for revoke)
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     email: i.email,
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     name: i.name,
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     phone: i.phone,
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     role: i.role,
     isSystemOwner: false, // Invites are never system owners
     status: "INVITED",
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
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
