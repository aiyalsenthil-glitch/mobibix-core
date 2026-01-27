"use client";

import { useState } from "react";

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  joinDate: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([
    {
      id: "1",
      name: "John Smith",
      email: "john@mobibix.com",
      role: "Technician",
      status: "active",
      joinDate: "2024-01-15",
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah@mobibix.com",
      role: "Manager",
      status: "active",
      joinDate: "2024-02-10",
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Technician",
  });

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const newStaff: Staff = {
      id: Date.now().toString(),
      ...formData,
      status: "active",
      joinDate: new Date().toISOString().split("T")[0],
    };
    setStaff([...staff, newStaff]);
    setFormData({ name: "", email: "", role: "Technician" });
    setShowAddForm(false);
  };

  const handleDeleteStaff = (id: string) => {
    setStaff(staff.filter((s) => s.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    setStaff(
      staff.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "active" ? "inactive" : "active" }
          : s,
      ),
    );
  };

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

      {/* Add Staff Form */}
      {showAddForm && (
        <div className="mb-8 p-6 bg-white/5 border border-teal-500/30 rounded-xl backdrop-blur">
          <h2 className="text-xl font-bold mb-4 text-teal-300">
            Add New Staff Member
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
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                >
                  <option>Technician</option>
                  <option>Manager</option>
                  <option>Supervisor</option>
                  <option>Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-all"
              >
                Save Staff
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
            {staff.filter((s) => s.status === "active").length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-lg p-4">
          <p className="text-stone-400 text-sm">Inactive</p>
          <p className="text-3xl font-bold text-red-300">
            {staff.filter((s) => s.status === "inactive").length}
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
                Joined
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
                  {member.name}
                </td>
                <td className="px-6 py-4 text-stone-400">{member.email}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-sm font-medium">
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleStatus(member.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      member.status === "active"
                        ? "bg-green-500/20 text-green-300 hover:bg-red-500/20 hover:text-red-300"
                        : "bg-red-500/20 text-red-300 hover:bg-green-500/20 hover:text-green-300"
                    }`}
                  >
                    {member.status === "active" ? "🟢 Active" : "🔴 Inactive"}
                  </button>
                </td>
                <td className="px-6 py-4 text-stone-400">
                  {new Date(member.joinDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDeleteStaff(member.id)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-medium transition-all text-sm"
                  >
                    Delete
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
