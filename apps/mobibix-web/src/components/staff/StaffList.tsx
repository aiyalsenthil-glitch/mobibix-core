"use client";

import { useState, useEffect } from "react";
import { Staff, listStaff, removeStaff } from "@/services/staff.api";
import { InviteStaffModal } from "./InviteStaffModal";

export function StaffList() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const data = await listStaff();
      setStaffList(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load staff list");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleRemove = async (staffId: string, status: "ACTIVE" | "INVITED") => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;

    try {
      await removeStaff(staffId, status);
      fetchStaff(); // Refresh list
    } catch (err: any) {
      alert(err.message || "Failed to remove staff");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-stone-400">Loading staff list...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Action */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">Staff Management</h3>
          <p className="text-sm text-stone-400">Manage access to your shop.</p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition shadow-lg shadow-teal-500/20 flex items-center gap-2"
        >
          <span>+</span> Invite Staff
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Staff List */}
      <div className="bg-stone-900/50 border border-white/5 rounded-xl overflow-hidden">
        {staffList.length === 0 ? (
          <div className="p-8 text-center text-stone-500">
            No staff members found. Invite someone to get started.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-white/5 text-stone-400 text-sm uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Name / Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{staff.name || "Unknown"}</div>
                    <div className="text-sm text-stone-500">{staff.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        staff.role === "OWNER"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {staff.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        staff.status === "ACTIVE"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {staff.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-stone-400 text-sm">
                    {new Date(staff.joinDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {staff.role !== "OWNER" && (
                      <button
                        onClick={() => handleRemove(staff.id, staff.status)}
                        className="text-stone-500 hover:text-red-400 transition"
                        title={staff.status === "INVITED" ? "Revoke Invite" : "Remove Staff"}
                      >
                        {staff.status === "INVITED" ? "Revoke" : "Remove"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={fetchStaff}
      />
    </div>
  );
}
