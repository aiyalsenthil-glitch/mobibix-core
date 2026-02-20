"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { RoleDto, listRoles, deleteRole } from "@/services/roles.api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RoleListScreen() {
  const { isSystemOwner } = usePermission();
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listRoles();
      setRoles(data);
    } catch (err: any) {
      setError(err.message || "Failed to load roles.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this custom role? Staff assigned to it must be reassigned.")) return;
    try {
      await deleteRole(id);
      fetchRoles();
    } catch (err: any) {
      alert(err.message || "Failed to delete role.");
    }
  };

  if (!isSystemOwner) {
    return (
      <div className="p-8 text-center bg-red-50 dark:bg-red-500/10 rounded-xl max-w-lg mx-auto mt-10">
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Access Denied</h2>
        <p className="text-red-500 mt-2">Only system owners can manage roles and permissions.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Role Management</h1>
          <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">
            Choose a simple template or create a custom set of permissions for your staff.
          </p>
        </div>
        <Link
          href="/roles/new"
          className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-medium rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2"
        >
          <span>✚</span> Create Custom Role
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-xl">
          {error}
        </div>
      )}

      {/* Basic Templates (System Roles) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-stone-200 border-b border-gray-200 dark:border-stone-800 pb-2">
          Ready-to-Use Templates
        </h2>
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-100 dark:bg-stone-800 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.filter(r => r.isSystem).map(role => (
              <div
                key={role.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/roles/${role.id}`)}
                className="relative p-6 bg-white dark:bg-stone-900 rounded-2xl border border-gray-200 dark:border-stone-800 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-xl hover:shadow-teal-500/10 cursor-pointer transition-all group overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400 rounded-bl-2xl font-medium text-xs">
                  Template
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{role.name}</h3>
                <p className="text-sm text-gray-500 dark:text-stone-400 line-clamp-2">
                  {role.description}
                </p>
                <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-semibold text-teal-500 dark:text-teal-400">View Blueprint →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Roles */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-stone-200 border-b border-gray-200 dark:border-stone-800 pb-2">
          Custom Roles
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-stone-800 animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {roles.filter(r => !r.isSystem).length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-stone-800 rounded-2xl text-gray-500 dark:text-stone-500">
                You haven't created any custom roles.
                <br />
                Most businesses never need to!
              </div>
            ) : (
              roles.filter(r => !r.isSystem).map(role => (
                <div key={role.id} className="flex flex-col sm:flex-row shadow-sm sm:items-center justify-between p-5 bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-800 hover:border-teal-400 dark:hover:border-stone-700 transition-all gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {role.name}
                      <span className="bg-gray-100 text-gray-600 dark:bg-stone-800 dark:text-stone-400 px-2 py-0.5 rounded text-xs font-medium">Custom</span>
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">{role.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push(`/roles/${role.id}`)}
                      className="px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 dark:text-teal-400 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 rounded-lg transition"
                    >
                      Edit Matrix
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
}
