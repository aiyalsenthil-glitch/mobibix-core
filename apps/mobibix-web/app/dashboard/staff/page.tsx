"use client";

import { useState, useEffect } from "react";
import { listStaff, addStaff, removeStaff, type Staff } from "@/services/staff.api";
import { useAuth } from "@/hooks/useAuth";

export default function StaffPage() {
  const { authUser } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "STAFF",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch staff on load
  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await listStaff();
      setStaff(data);
    } catch (err: any) {
      console.error("Failed to load staff", err);
      setError("Failed to load staff members");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await addStaff({
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
      });
      
      // Reset and reload
      setFormData({ name: "", email: "", phone: "", role: "STAFF" });
      setShowAddForm(false);
      await loadStaff();
      alert("Staff invited successfully via email!");
    } catch (err: any) {
      setError(err.message || "Failed to add staff");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string, isInvite: boolean) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;

    try {
      setError(null);
      await removeStaff(id, isInvite ? "INVITED" : "ACTIVE");
      await loadStaff();
    } catch (err: any) {
      setError(err.message || "Failed to remove staff");
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Loading staff...</div>;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            👥 Staff Management
          </h1>
          <p className="text-stone-400">
            Manage your team members and their roles
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-all shadow-lg"
        >
          + Add Staff
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Add Staff Form */}
      {showAddForm && (
        <div className="mb-8 p-6 bg-white/5 border border-teal-500/30 rounded-xl backdrop-blur">
          <h2 className="text-xl font-bold mb-4 text-teal-300">
            Invite New Staff Member
          </h2>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                  className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-stone-500 focus:border-teal-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john@example.com"
                  className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-stone-500 focus:border-teal-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-2">
                   Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-stone-500 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Sending Invite..." : "Send Invite"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 bg-stone-700 hover:bg-stone-600 text-white font-semibold rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border border-teal-500/20 rounded-lg p-4">
          <p className="text-stone-400 text-sm">Total Staff</p>
          <p className="text-3xl font-bold text-teal-300">{staff.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-4">
          <p className="text-stone-400 text-sm">Active</p>
          <p className="text-3xl font-bold text-green-300">
            {staff.filter((s) => s.status === "ACTIVE").length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-stone-400 text-sm">Invited (Pending)</p>
          <p className="text-3xl font-bold text-yellow-300">
            {staff.filter((s) => s.status === "INVITED").length}
          </p>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-6 py-4 text-left text-sm font-semibold text-teal-300">
                Name
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-teal-300">
                Email
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-teal-300">
                Role
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-teal-300">
                Status
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-teal-300">
                Created / Joined
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-teal-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr
                key={member.id}
                className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-6 py-4 text-white font-medium">
                  {member.name || "Unknown"}
                  {member.phone && <span className="block text-xs text-stone-500">{member.phone}</span>}
                </td>
                <td className="px-6 py-4 text-stone-400">{member.email}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-sm font-medium">
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      member.status === "ACTIVE"
                        ? "bg-green-500/20 text-green-300"
                        : "bg-yellow-500/20 text-yellow-300"
                    }`}
                  >
                    {member.status === "ACTIVE" ? "🟢 Active" : "🟡 Invited"}
                  </span>
                </td>
                <td className="px-6 py-4 text-stone-400">
                  {new Date(member.joinDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDeleteStaff(member.id, member.status === "INVITED")}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-medium transition-all text-sm"
                  >
                    {member.status === "INVITED" ? "Revoke" : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {staff.length === 0 && (
        <div className="text-center py-12">
          <p className="text-stone-400 text-lg">
            No staff members yet. Add one to get started!
          </p>
        </div>
      )}
    </div>
  );
}
