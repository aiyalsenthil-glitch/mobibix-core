"use client";

import { useEffect, useState } from "react";
import { listShops, type Shop } from "@/services/shops.api";
import { ShopFormModal } from "./ShopFormModal";
import { useRouter } from "next/navigation";

import { getTenantUsage, type TenantUsageResponse } from "@/services/tenant.api";

  export default function ShopsPage() {
    const router = useRouter(); // Hook
    const [shops, setShops] = useState<Shop[]>([]);
    const [usage, setUsage] = useState<TenantUsageResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    // REMOVED: isSettingsModalOpen state
    const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Parallel fetch for speed
        const [shopsData, usageData] = await Promise.all([
            listShops(),
            getTenantUsage()
        ]);
        
        setShops(shopsData);
        setUsage(usageData);
      } catch (err: any) {
        console.error("Error loading data:", err);
        setError(err.message || "Failed to load shops");
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Calculate Limits
    // Calculate Limits
    // console.log('--- SHOPS PAGE DEBUG ---');

    const rawMaxShops = usage?.plan?.maxShops;
    const maxShops = rawMaxShops === undefined ? 1 : rawMaxShops;
    const isLimitReached = maxShops !== null && shops.length >= maxShops;

    const handleCreateShop = () => {
        if (isLimitReached) return;
        setSelectedShop(null);
        setIsFormModalOpen(true);
    };

    const handleEditShop = (shop: Shop) => {
        setSelectedShop(shop);
        setIsFormModalOpen(true);
    };

    const handleOpenSettings = (shop: Shop) => {
      router.push(`/shops/${shop.id}/settings`);
    };

    const handleFormModalClose = () => {
      setIsFormModalOpen(false);
      setSelectedShop(null);
      loadData(); 
    };

    const handleDeleteShop = async (shopId: string) => {
      if (!confirm("Are you sure you want to delete this shop?")) return;
      try {
        alert("Delete functionality coming soon");
      } catch (err: any) {
        alert(err.message || "Failed to delete shop");
      }
    };

// ... (existing code)

  return (
    <div>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
        <div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">Shops</h1>
            {usage?.plan && (
                <div className="flex items-center gap-3 text-sm">
                    <span className="px-3 py-1 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 dark:from-teal-500/20 dark:to-emerald-500/20 text-teal-800 dark:text-teal-300 rounded-md font-semibold border border-teal-200 dark:border-teal-500/30">
                      {usage.plan.name}
                    </span>
                    <span className="text-gray-500 dark:text-stone-400">
                      Used <span className={isLimitReached ? "text-red-500 font-bold" : "text-gray-900 dark:text-white font-bold"}>{shops.length}</span> out of {maxShops === null ? "Unlimited" : maxShops}
                    </span>
                </div>
            )}
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          {/* Banner for Limit Reached */}
          {isLimitReached && (
            <div className="flex-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 px-5 flex items-center justify-between shadow-sm">
               <div className="flex items-center gap-3">
                 <span className="text-2xl">⚠️</span>
                 <div>
                    <p className="text-amber-900 dark:text-amber-200 font-bold text-sm">Shop Limit Reached</p>
                    <p className="text-amber-700 dark:text-amber-300/80 text-xs mt-0.5">
                      Your {usage?.plan?.name} plan is limited to {maxShops} shops.
                    </p>
                 </div>
               </div>
               <button 
                  onClick={() => router.push('/settings')}
                  className="ml-4 px-4 py-2 bg-amber-200 hover:bg-amber-300 dark:bg-amber-600 dark:hover:bg-amber-500 text-amber-900 dark:text-white text-xs font-black rounded-lg uppercase tracking-wider transition-all shadow-sm"
               >
                  Upgrade
               </button>
            </div>
          )}

          <div className="relative group w-full sm:w-auto">
            <button
              onClick={handleCreateShop}
              disabled={isLimitReached}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                isLimitReached 
                    ? "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10"
                    : "bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-600 hover:to-teal-500 shadow-teal-500/25 text-white transform hover:-translate-y-0.5"
              }`}
            >
              {isLimitReached ? (
                  <>🔒 Limit Reached</>
              ) : (
                  <>+ Add New Shop</>
              )}
            </button>
            
            {/* Tooltip for disabled state */}
            {isLimitReached && (
               <div className="absolute right-0 top-full mt-3 w-48 bg-gray-900 dark:bg-black text-white text-xs p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
                  Upgrade your plan to open more locations.
               </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 text-red-800 dark:text-red-300 px-6 py-4 rounded-r-xl mb-6 shadow-sm">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-stone-400 gap-4">
           <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div>
           <p className="font-medium animate-pulse">Loading architectural blueprints...</p>
        </div>
      ) : shops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-3xl text-center px-4 shadow-inner">
          <div className="w-24 h-24 bg-teal-100 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center text-5xl mb-6 shadow-sm">
            🏪
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">No Shops Created Yet</h3>
          <p className="text-gray-500 dark:text-stone-400 mb-8 max-w-md text-base leading-relaxed">
            Create your first shop profile to start managing your point-of-sale operations, tracking inventory, and viewing precise analytics.
          </p>
          <button
            onClick={handleCreateShop}
            disabled={isLimitReached}
            className="px-8 py-3.5 bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-600 hover:to-teal-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-teal-500/25 transform hover:-translate-y-1"
          >
            Create Your First Shop
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          {Array.isArray(shops) && shops.map((shop) => (
            <div 
              key={shop.id} 
              className="group flex flex-col relative bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-teal-500/10 dark:hover:border-teal-500/30 transition-all duration-300 cursor-default"
            >
              {/* Status Badge */}
              <div className="absolute top-5 right-5 z-10">
                 <span
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm ${
                      shop.isActive
                        ? "bg-green-100/80 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20 backdrop-blur-sm"
                        : "bg-red-100/80 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20 backdrop-blur-sm"
                    }`}
                  >
                    {shop.isActive ? "Active" : "Inactive"}
                  </span>
              </div>

              {/* Header Profile */}
              <div className="p-7 pb-5">
                 <div className="w-14 h-14 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-500/20 dark:to-emerald-500/10 border border-teal-100 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center text-2xl mb-5 shadow-sm">
                    🏢
                 </div>
                 <h3 className="text-2xl font-bold text-gray-900 dark:text-white truncate pr-20">{shop.name}</h3>
                 <p className="text-sm text-gray-500 dark:text-stone-400 mt-2 flex items-center gap-2 font-medium">
                    <span className="text-lg opacity-70">📍</span> {shop.city || "No city specified"}
                 </p>
              </div>

              {/* Data Strip */}
              <div className="px-7 py-5 bg-gray-50 dark:bg-white/[0.02] border-y border-gray-100 dark:border-white/5 flex grid grid-cols-2 gap-6 flex-1">
                 <div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-stone-500 mb-1.5 uppercase tracking-widest">Phone</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-stone-200 truncate">{shop.phone || "-"}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-stone-500 mb-1.5 uppercase tracking-widest">GST Number</p>
                    {shop.gstNumber ? (
                      <p className="text-xs font-mono font-bold text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-500/20 border border-teal-200 dark:border-teal-500/30 px-2.5 py-1 rounded inline-block">
                        {shop.gstNumber}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-stone-600 font-medium">-</p>
                    )}
                 </div>
              </div>

              {/* Footer Actions */}
              <div className="p-5 px-7 flex items-center gap-3">
                 <button
                    onClick={() => handleOpenSettings(shop)}
                    className="flex-1 py-3 bg-white dark:bg-[#1A1A1A] hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-stone-300 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow"
                 >
                    <span>⚙️</span> Manage Settings
                 </button>
                 <button
                    onClick={() => handleDeleteShop(shop.id)}
                    className="p-3 bg-white dark:bg-[#1A1A1A] hover:bg-red-50 dark:hover:bg-red-500/10 border border-gray-200 dark:border-white/10 hover:border-red-200 dark:hover:border-red-500/30 text-gray-400 hover:text-red-600 dark:text-stone-500 dark:hover:text-red-400 rounded-xl text-lg font-medium transition-all shadow-sm group-hover:opacity-100"
                    title="Delete Shop"
                 >
                    🗑️
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}



      {isFormModalOpen && (
        <ShopFormModal shop={selectedShop} onClose={handleFormModalClose} />
      )}
      
      {/* Settings Modal Removed - Navigates to page now */}
    </div>
  );
}
