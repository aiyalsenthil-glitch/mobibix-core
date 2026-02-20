"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { RoleDto, getRole, createRole, updateRole } from "@/services/roles.api";
import { PERMISSION_DICTIONARY } from "@/lib/permissions.dict";
import Link from "next/link";

export default function RoleEditScreen() {
  const params = useParams();
  const router = useRouter();
  const roleId = params.id as string;
  const isNew = roleId === "new";

  const { isSystemOwner, activePermissions } = usePermission();
  const { authUser } = useAuth();
  
  // Assume tenant.enabledModules is fetched. Mocking it here for UX.
  const enabledModules = ["MOBILE_SHOP", "CORE"]; // Hiding GYM for this mock context

  const [role, setRole] = useState<RoleDto | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("MOBILE_SHOP");
  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter modules based on tenant
  const visibleModules = useMemo(() => {
    return PERMISSION_DICTIONARY.filter(m => enabledModules.includes(m.moduleId));
  }, [enabledModules]);

  // Load role data
  useEffect(() => {
    if (!isNew) {
      getRole(roleId).then(data => {
        setRole(data);
        setName(data.name);
        setDescription(data.description);
        setSelectedActions(new Set(data.permissions));
        
        // If it's a clone action, we drop isSystem lock
        if (data.isSystem) {
          // This represents viewing a System template. The user will have to "Clone" it to save.
        }
      }).catch(err => {
        setError(err.message || "Failed to load role");
      }).finally(() => {
        setLoading(false);
      });
    } else {
      setRole({
        id: "new",
        name: "",
        description: "",
        isSystem: false,
        permissions: []
      });
    }
  }, [roleId, isNew]);

  const handleToggle = (actionId: string, checked: boolean) => {
    if (role?.isSystem) return; // Read-only for system templates

    const newSet = new Set(selectedActions);
    if (checked) {
      newSet.add(actionId);
    } else {
      newSet.delete(actionId);
    }
    setSelectedActions(newSet);
  };

  const hasSensitiveEnabled = useMemo(() => {
    for (const mod of PERMISSION_DICTIONARY) {
      for (const res of mod.resources) {
        for (const perm of res.permissions) {
          if (perm.isSensitive && selectedActions.has(perm.actionId)) {
            return true;
          }
        }
      }
    }
    return false;
  }, [selectedActions]);

  const handleSave = async () => {
    if (name.trim() === "") {
      setError("Role Name is required.");
      return;
    }
    if (selectedActions.size === 0) {
      setError("A role must have at least one permission.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const payload = {
        name,
        description,
        permissions: Array.from(selectedActions)
      };

      if (isNew || role?.isSystem) {
        // We always CREATE a new custom role if it's "new" or we are cloning a system role
        await createRole({ ...payload, isSystem: false });
        router.push("/roles");
      } else {
        await updateRole(roleId, payload);
        router.push("/roles");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save role");
      setSubmitting(false);
    }
  };

  if (!isSystemOwner) {
    return (
      <div className="p-8 text-center bg-red-50 dark:bg-red-500/10 rounded-xl max-w-lg mx-auto mt-10">
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Access Denied</h2>
        <p className="text-red-500 mt-2">Only system owners can manage roles.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading role data...</div>;
  }

  const isReadOnly = role?.isSystem;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header & Warning State */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/roles" className="text-gray-400 hover:text-teal-500 transition">
              ← Back to Roles
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {isNew ? "Create Custom Role" : isReadOnly ? `Template: ${role?.name}` : `Edit Role: ${role?.name}`}
            {isReadOnly && <span className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 px-2 py-0.5 rounded text-xs">Read Only</span>}
          </h1>
          <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">
            {isReadOnly 
              ? "This is a locked template. You can view its permissions here. To make changes, clone it." 
              : "Toggle exactly what staff assigned to this role can and cannot do."}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => router.push("/roles")}
            className="px-4 py-2 font-medium text-gray-700 bg-white border border-gray-300 dark:bg-transparent dark:text-gray-300 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-stone-800 rounded-lg transition flex-1 md:flex-none"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={submitting || selectedActions.size === 0}
            className={`px-6 py-2 font-medium text-white rounded-lg shadow-lg flex-1 md:flex-none transition ${
              submitting || selectedActions.size === 0
                ? "bg-teal-400 cursor-not-allowed opacity-70"
                : "bg-teal-600 hover:bg-teal-700 shadow-teal-500/20 active:bg-teal-800"
            }`}
          >
            {submitting ? "Saving..." : isReadOnly ? "Clone & Save" : "Save Role"}
          </button>
        </div>
      </div>

      {/* Sensitive Banner */}
      {!isReadOnly && hasSensitiveEnabled && (
        <div className="p-4 bg-orange-50 border-l-4 border-orange-500 dark:bg-orange-900/10 dark:border-orange-500/50 rounded-r-xl flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h3 className="text-sm font-bold text-orange-800 dark:text-orange-400">Sensitive Access Granted</h3>
            <p className="text-xs text-orange-700 dark:text-orange-500/80">
              You have enabled permissions that grant access to sensitive financial or administrative data. Be careful who you assign this role to!
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left Column: Metadata & Tabs */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-stone-900 p-5 border border-gray-200 dark:border-stone-800 rounded-2xl shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-stone-400 mb-2">Role Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={isReadOnly}
                  placeholder="e.g. Senior Manager"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-stone-950 border border-gray-200 dark:border-stone-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-stone-400 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={isReadOnly}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-stone-950 border border-gray-200 dark:border-stone-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-stone-400 p-4 border-b border-gray-100 dark:border-stone-800 bg-gray-50/50 dark:bg-stone-900/50">
              Module Permissions
            </h3>
            <div className="flex flex-col">
              {visibleModules.map(mod => (
                <button
                  key={mod.moduleId}
                  onClick={() => setActiveTab(mod.moduleId)}
                  className={`text-left px-5 py-3 text-sm font-medium transition border-l-2 ${
                    activeTab === mod.moduleId
                      ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400"
                      : "border-transparent text-gray-600 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800"
                  }`}
                >
                  {mod.uiLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Permission Matrix */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            {visibleModules.find(m => m.moduleId === activeTab)?.resources.map((resource, i) => (
              <div key={resource.resourceId} className={`p-6 ${i !== 0 ? "border-t border-gray-100 dark:border-stone-800" : ""}`}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{resource.uiLabel}</h3>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  {resource.permissions.map(perm => (
                    <label 
                      key={perm.actionId}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedActions.has(perm.actionId)
                          ? perm.isSensitive 
                            ? "border-orange-300 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-500/30" 
                            : "border-teal-300 bg-teal-50 dark:bg-teal-900/10 dark:border-teal-500/30"
                          : "border-gray-200 dark:border-stone-800 hover:bg-gray-50 dark:hover:bg-stone-800/50"
                      } ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <div className="mt-0.5">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          selectedActions.has(perm.actionId)
                            ? perm.isSensitive
                               ? "bg-orange-500 border-orange-600"
                               : "bg-teal-500 border-teal-600"
                            : "bg-white border-gray-300 dark:bg-stone-900 dark:border-stone-700"
                        }`}>
                          {selectedActions.has(perm.actionId) && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          disabled={isReadOnly}
                          checked={selectedActions.has(perm.actionId)}
                          onChange={e => handleToggle(perm.actionId, e.target.checked)}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-bold ${
                            selectedActions.has(perm.actionId)
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-700 dark:text-stone-300"
                          }`}>
                            {perm.uiLabel}
                          </span>
                          {perm.isSensitive && (
                            <span className="bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded">
                              Sensitive
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${
                          selectedActions.has(perm.actionId)
                            ? perm.isSensitive ? "text-orange-700 dark:text-orange-400/80" : "text-teal-700 dark:text-teal-400/80"
                            : "text-gray-500 dark:text-stone-400"
                        }`}>
                          {perm.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
