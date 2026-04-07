"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Mail, Phone, Calendar, Shield, Clock, Building2, Check } from "lucide-react";
import { listStaff, addStaff, removeStaff, type Staff } from "@/services/staff.api";
import { listRoles, type RoleDto } from "@/services/roles.api";
import { listShops, type Shop } from "@/services/shops.api";
import { getTenantUsage } from "@/services/tenant.api";
import { format } from "date-fns";
import PageTabs from "@/components/layout/PageTabs";

export default function StaffTab() {
  const [activeTab, setActiveTab] = useState("active");
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planMaxStaff, setPlanMaxStaff] = useState<number | null>(null);
  
  // Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    phone: "",
    roleId: "",
    branchIds: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [staffData, rolesData, shopsData, usageData] = await Promise.all([
        listStaff(),
        listRoles(),
        listShops(),
        getTenantUsage().catch(() => null),
      ]);
      setStaffList(staffData);
      setPlanMaxStaff(usageData?.plan?.maxStaff ?? null);

      const filteredRoles = (rolesData ?? []).filter(role => {
        if (!role.isSystem) return true;
        const hasGym = role.permissions.some(p => p.startsWith('gym.'));
        const hasMobileShop = role.permissions.some(p => p.startsWith('mobile_shop.'));
        if (hasGym && !hasMobileShop) return false;
        return true;
      });
      setRoles(filteredRoles);

      setShops(shopsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load staff management data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.name) return;

    try {
      setIsSubmitting(true);
      await addStaff({
        ...inviteForm,
        roleId: inviteForm.roleId || undefined,
      });
      setIsInviteModalOpen(false);
      setInviteForm({ email: "", name: "", phone: "", roleId: "", branchIds: [] });
      loadData();
      alert("Invitation sent successfully!");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to invite staff");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleBranch = (branchId: string) => {
    setInviteForm(prev => ({
      ...prev,
      branchIds: prev.branchIds.includes(branchId)
        ? prev.branchIds.filter(id => id !== branchId)
        : [...prev.branchIds, branchId]
    }));
  };

  const handleRemove = async (staff: Staff) => {
    if (!confirm(`Are you sure you want to remove ${staff.name || staff.email}?`)) return;

    try {
      await removeStaff(staff.id, staff.status as ("ACTIVE" | "INVITED")); 
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove staff");
    }
  };

  const activeStaff = staffList.filter((s) => s.status === "ACTIVE");
  const invitedStaff = activeTab === "pending" ? staffList.filter((s) => s.status === "INVITED") : [];

  const staffLocked = planMaxStaff === 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        {staffLocked ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-400 text-sm font-medium cursor-not-allowed select-none">
            🔒 Staff not available
            <span className="px-1.5 py-0.5 text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded font-semibold">Standard plan</span>
          </div>
        ) : (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
          >
            <Plus size={18} />
            Invite Staff
          </button>
        )}
      </div>

      <PageTabs
        tabs={[
          { id: "active", label: `Active Staff (${activeStaff.length})` },
          { id: "pending", label: `Pending Invites (${staffList.filter(s => s.status === "INVITED").length})` },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading staff...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(activeTab === "active" ? activeStaff : invitedStaff).map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                          {staff.name?.[0]?.toUpperCase() || staff.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{staff.name || "Unknown"}</div>
                          <div className="text-sm text-gray-500">{staff.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        (staff.isSystemOwner || staff.role?.toUpperCase() === "OWNER")
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}>
                        <Shield size={12} />
                        {staff.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {staff.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone size={14} />
                          {staff.phone}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                         {staff.status === "INVITED" ? <Clock size={14} className="text-amber-500" /> : <Calendar size={14} />}
                         {staff.status === "INVITED" ? "Pending" : format(new Date(staff.joinDate), "MMM d, yyyy")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!(staff.isSystemOwner || staff.role?.toUpperCase() === "OWNER") && (
                        <button
                          onClick={() => handleRemove(staff)}
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          title={staff.status === "INVITED" ? "Revoke Invite" : "Remove Staff"}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(activeTab === "active" ? activeStaff : invitedStaff).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      No {activeTab === "active" ? "active staff" : "pending invites"} found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invite Staff Member</h2>
              <p className="text-sm text-gray-500 mt-1">Send an invitation email to add a new team member.</p>
            </div>
            
            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteForm.name}
                  onChange={e => setInviteForm({...inviteForm, name: e.target.value})}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={e => setInviteForm({...inviteForm, email: e.target.value})}
                    className="w-full pl-10 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={inviteForm.phone}
                    onChange={e => setInviteForm({...inviteForm, phone: e.target.value})}
                    className="w-full pl-10 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Role</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    value={inviteForm.roleId}
                    onChange={e => setInviteForm({...inviteForm, roleId: e.target.value})}
                    className="w-full pl-10 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Default Staff Permissions</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign to Shops</label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {shops.map(shop => (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => toggleBranch(shop.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        inviteForm.branchIds.includes(shop.id)
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                          : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 size={16} />
                        <span className="text-sm font-medium">{shop.name}</span>
                      </div>
                      {inviteForm.branchIds.includes(shop.id) && (
                        <Check size={16} className="text-indigo-500" />
                      )}
                    </button>
                  ))}
                  {shops.length === 0 && (
                    <p className="text-xs text-center text-gray-400 py-4">No shops found to assign.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>Sending...</>
                  ) : (
                    <>Send Invitation</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
