"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { updateUserProfile, updateFirebaseProfile } from "@/services/auth.api";
import { User, Mail, Shield, Camera, Save, Key, Phone, MapPin, Check, Loader2, Cloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfilePage() {
  const { authUser, refreshSession } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const initialName = authUser?.name || (authUser as any)?.displayName || "Guest User";
  const [nameInput, setNameInput] = useState(initialName);
  const [phoneInput, setPhoneInput] = useState("");
  const [locationInput, setLocationInput] = useState("Chennai, India");
  const [savedName, setSavedName] = useState(initialName);

  const userEmail = authUser?.email || "No email linked";
  const userRole = authUser?.isSystemOwner ? "System Administrator" : (authUser?.role || "Team Member");

  useEffect(() => {
    if (authUser) {
      const name = authUser?.name || (authUser as any)?.displayName || "Guest User";
      setNameInput(name);
      setSavedName(name);
    }
  }, [authUser]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      // Step 1: Update Firebase Auth Profile (ensures backend metadata sync doesn't revert change)
      await updateFirebaseProfile(nameInput);

      // Step 2: Update Application Database (PATCH /users/me)
      await updateUserProfile({
        fullName: nameInput,
        phone: phoneInput || undefined,
      });

      // Local State Update
      setSavedName(nameInput);
      
      // Step 3: Global State Reconciliation
      await refreshSession();

      setIsSaving(false);
      setIsEditing(false);
      setShowSuccess(true);
      
      // Clear success after 4s
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err: any) {
      console.error("Critical Identity Sync Failure:", err);
      setError(err.message || "Could not synchronize identity layers. Please check your connection.");
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed bottom-10 right-10 z-[100]"
          >
            <div className="bg-emerald-500 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border-2 border-white dark:border-zinc-950">
               <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Check size={18} className="text-white" />
               </div>
               <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white">Identity Synced</p>
                  <p className="text-[10px] font-bold text-white/80 italic">Firebase & DB Layers Synchronized.</p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-12">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 italic">Account Profile</h1>
          <p className="text-zinc-500 text-sm font-medium">Manage your personal information and security preferences.</p>
        </div>
        <button 
          onClick={() => {
            if (isEditing) {
              setNameInput(savedName); // Revert on discard
              setIsEditing(false);
              setError(null);
            } else {
              setIsEditing(true);
            }
          }}
          className={`px-6 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            isEditing 
            ? "bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-white/5" 
            : "bg-zinc-900 dark:bg-primary text-white shadow-lg active:scale-95"
          }`}
        >
          {isEditing ? "Discard Changes" : "Edit Profile"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl text-[11px] font-bold uppercase mb-8">
           Sync Failed: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Avatar & Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="human-card p-10 flex flex-col items-center text-center bg-white dark:bg-zinc-900/50">
            <div className="relative group cursor-pointer mb-6">
              <div className="w-32 h-32 rounded-[32px] bg-zinc-900 dark:bg-primary border-4 border-white dark:border-zinc-950 flex items-center justify-center text-4xl font-black text-white shadow-xl">
                {savedName[0].toUpperCase()}
              </div>
              <div className="absolute inset-0 rounded-[32px] bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="text-white" size={24} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{savedName}</h2>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">{userRole}</p>
            
            <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-white/5 w-full space-y-4">
               <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-zinc-400 uppercase tracking-widest">Account Status</span>
                  <span className="text-emerald-500">Active</span>
               </div>
               <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-zinc-400 uppercase tracking-widest">Two-Factor</span>
                  <span className="text-zinc-500">Disabled</span>
               </div>
            </div>
          </div>

          <div className="human-card p-6 bg-zinc-50/50 dark:bg-zinc-900/20 border-dashed border-zinc-200 dark:border-white/10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 flex items-center gap-2">
              <Shield size={14} className="text-primary" /> Security Tip
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Enable Two-Factor Authentication (2FA) to add an extra layer of protection to your business records.
            </p>
          </div>
        </div>

        {/* Right Column: Form Fields */}
        <div className="lg:col-span-2 space-y-8">
           <div className="human-card p-10 bg-white dark:bg-zinc-900/50">
             <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-8 flex items-center gap-3 italic">
                <User size={18} className="text-zinc-400" /> Basic Information
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Full Name</label>
                   <input 
                     type="text" 
                     value={nameInput}
                     onChange={(e) => setNameInput(e.target.value)}
                     disabled={!isEditing}
                     className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50" 
                     placeholder="Enter your name"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Email Address</label>
                   <div className="relative">
                      <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="email" 
                        disabled
                        className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/5 rounded-xl px-12 py-3 text-xs font-bold opacity-50 cursor-not-allowed" 
                        value={userEmail}
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Phone Number</label>
                   <div className="relative">
                      <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="tel" 
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        disabled={!isEditing}
                        className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/5 rounded-xl px-12 py-3 text-xs font-bold outline-none ring-0 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50" 
                        placeholder="+91 88388 22461"
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Location</label>
                   <div className="relative">
                      <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="text" 
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        disabled={!isEditing}
                        className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/5 rounded-xl px-12 py-3 text-xs font-bold outline-none ring-0 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50" 
                        placeholder="Chennai, India"
                      />
                   </div>
                </div>
             </div>
           </div>

           <div className="human-card p-10 bg-white dark:bg-zinc-900/50">
             <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-8 flex items-center gap-3">
                <Key size={18} className="text-zinc-400" /> Password & Security
             </h3>
             <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-zinc-50 dark:bg-black/40 border border-zinc-100 dark:border-white/5">
                <div>
                   <p className="text-xs font-bold">Update Account Password</p>
                   <p className="text-[10px] text-zinc-500 mt-1 font-medium">Last changed 24 days ago.</p>
                </div>
                <button className="px-5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all active:scale-95">
                   Change Password
                </button>
             </div>
           </div>

           {isEditing && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex justify-end gap-3"
             >
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-8 py-4 bg-zinc-900 dark:bg-primary text-white rounded-2xl text-xs font-bold shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                   {isSaving ? (
                     <>
                       <Cloud size={16} className="animate-pulse" /> 
                       Full Multi-Layer Syncing...
                     </>
                   ) : (
                     <>
                       <Save size={16} /> 
                       Confirm Identity Sync
                     </>
                   )}
                </button>
             </motion.div>
           )}
        </div>
      </div>
    </div>
  );
}
