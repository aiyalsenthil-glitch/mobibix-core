"use client";

import { useState, useEffect } from "react";
import { addStaff } from "@/services/staff.api";
import { Shop, listShops } from "@/services/shops.api";
import { RoleDto, listRoles } from "@/services/roles.api";
import { useRouter } from "next/navigation";

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteStaffModal({ isOpen, onClose, onSuccess }: InviteStaffModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  
  // Step 1: Details & Branch
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  
  // Step 2: Role
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const [shops, setShops] = useState<Shop[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmail("");
      setName("");
      setPhone("");
      setSelectedBranches(new Set());
      setSelectedRoleId(null);
      setError(null);
      
      listShops().then(setShops).catch(console.error);
      listRoles().then(setRoles).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleBranch = (id: string) => {
    const newSet = new Set(selectedBranches);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedBranches(newSet);
  };

  const handleNext = () => {
    if (!name || !email) {
      setError("Name and Email are required.");
      return;
    }
    if (selectedBranches.size === 0) {
      setError("Please select at least one branch for this staff member.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedRoleId) {
      setError("Please select a role.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await addStaff({ 
        email, 
        name, 
        phone, 
        roleId: selectedRoleId,
        branchIds: Array.from(selectedBranches) 
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to invite staff");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-stone-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center bg-gray-50/50 dark:bg-stone-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {step === 1 ? "Invite Staff Member" : "Select Role"}
            </h2>
            <p className="text-slate-500 dark:text-stone-400 text-sm mt-1">
              {step === 1 ? "Step 1: Enter details and select branch locations." : "Step 2: Choose what this person can do."}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-stone-800 rounded-lg text-gray-500 transition">
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-stone-300 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-stone-950 border border-slate-200 dark:border-stone-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="E.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-stone-300 mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-stone-950 border border-slate-200 dark:border-stone-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-stone-300 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-stone-950 border border-slate-200 dark:border-stone-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-stone-300 mb-3 border-b border-gray-100 dark:border-stone-800 pb-2">
                  Where will they work? *
                </label>
                {shops.length === 0 ? (
                  <div className="text-sm text-gray-500 animate-pulse">Loading branches...</div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {shops.map(shop => (
                      <label 
                        key={shop.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedBranches.has(shop.id) 
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10 dark:border-teal-500" 
                            : "border-gray-200 hover:border-teal-300 dark:border-stone-800 dark:hover:border-stone-600"
                        }`}
                      >
                         <input
                          type="checkbox"
                          className="mt-1 shrink-0 accent-teal-600"
                          checked={selectedBranches.has(shop.id)}
                          onChange={() => toggleBranch(shop.id)}
                        />
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-white">{shop.name}</div>
                          <div className="text-xs text-gray-500 dark:text-stone-400 mt-0.5">{shop.addressLine1 || "No address set"}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Role Templates Grid (Simple Mode) */}
              <div className="grid sm:grid-cols-2 gap-4">
                {roles.filter(r => r.name !== "System Owner").map(role => (
                  <div 
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedRoleId === role.id 
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10 dark:border-teal-500" 
                        : "border-gray-200 bg-white hover:border-teal-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-600"
                    }`}
                  >
                    {selectedRoleId === role.id && (
                      <div className="absolute top-4 right-4 text-teal-500">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                      </div>
                    )}
                    <h3 className="font-bold text-gray-900 dark:text-white pr-8">{role.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-stone-400 mt-2 line-clamp-3">
                      {role.description}
                    </p>
                    {!role.isSystem && (
                      <span className="inline-block mt-3 px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-stone-800 dark:text-stone-300 text-xs rounded font-medium">Custom</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Advanced Breakout */}
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-stone-800">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-stone-950 border border-gray-100 dark:border-stone-800">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Need exact granular control?</h4>
                    <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">Create a custom role with exact checkboxes by leaving this flow.</p>
                  </div>
                  <button 
                    onClick={() => {
                      onClose();
                      router.push("/roles/new");
                    }} 
                    className="px-4 py-2 bg-white dark:bg-stone-900 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-stone-700 rounded-lg hover:bg-gray-50 dark:hover:bg-stone-800 whitespace-nowrap"
                  >
                    Advanced Editor →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 dark:border-stone-800 bg-gray-50/50 dark:bg-stone-900/50 flex justify-between items-center">
          {step === 2 ? (
            <button
              onClick={() => { setStep(1); setError(null); }}
              className="px-5 py-2 text-sm font-medium text-slate-600 dark:text-stone-300 hover:text-slate-900 dark:hover:text-white"
            >
              ← Back to Details
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-slate-500 dark:text-stone-400 hover:text-slate-800 dark:hover:text-white"
            >
              Cancel
            </button>
          )}

          {step === 1 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium rounded-xl shadow-lg shadow-teal-500/20 transition-all"
            >
              Next: Select Role →
            </button>
          ) : (
            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !selectedRoleId}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2"
            >
              {isLoading ? "Sending Invite..." : "Send Invitation"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
