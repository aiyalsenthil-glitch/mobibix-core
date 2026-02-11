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
    console.log('--- SHOPS PAGE DEBUG ---');
    console.log('Plan:', usage?.plan);
    console.log('Max Shops (Raw):', usage?.plan?.maxShops);
    console.log('------------------------');

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
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shops</h1>
            {usage?.plan && (
                <p className="text-gray-500 dark:text-stone-400 text-sm mt-1">
                    Plan: <span className="text-teal-600 dark:text-teal-400 font-medium">{usage.plan.name}</span> • 
                    Shops: <span className={isLimitReached ? "text-red-500 font-bold" : ""}>{shops.length}</span> / {maxShops === null ? "Unlimited" : maxShops}
                </p>
            )}
        </div>
        
        {/* Banner for Limit Reached */}
        {isLimitReached && (
          <div className="flex-1 mx-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-3 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <span className="text-xl">⚠️</span>
               <div>
                  <p className="text-amber-800 dark:text-amber-200 font-medium text-sm">Shop Limit Reached</p>
                  <p className="text-amber-700 dark:text-amber-300/80 text-xs">
                    Your {usage?.plan?.name} plan is limited to {maxShops} shops.
                  </p>
               </div>
             </div>
             <button 
                onClick={() => router.push('/settings')}
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 text-xs font-bold rounded uppercase tracking-wide transition"
             >
                Upgrade Plan
             </button>
          </div>
        )}

        <div className="relative group">
          <button
            onClick={handleCreateShop}
            disabled={isLimitReached}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              isLimitReached 
                  ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed"
                  : "bg-teal-500 hover:bg-teal-600 text-white"
            }`}
          >
            {isLimitReached ? (
                <>🔒 Limit Reached</>
            ) : (
                <>+ Add Shop</>
            )}
          </button>
          
          {/* Tooltip for disabled state */}
          {isLimitReached && (
             <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Upgrade to add more shops.
             </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-stone-400">Loading shops...</div>
      ) : shops.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-400 mb-4">No shops created yet</p>
          <button
            onClick={handleCreateShop}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition"
          >
            Create your first shop
          </button>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 dark:text-stone-300">
                    Shop Name
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 dark:text-stone-300">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 dark:text-stone-300">
                    City
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 dark:text-stone-300">
                    GST
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 dark:text-stone-300">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 dark:text-stone-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {Array.isArray(shops) && shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                      {shop.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-stone-300">
                      {shop.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-stone-300">
                      {shop.city || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-stone-300">
                      {shop.gstNumber ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                          {shop.gstNumber.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-gray-700 dark:text-stone-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          shop.isActive
                            ? "bg-green-500/20 text-green-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {shop.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenSettings(shop)}
                          className="p-2 hover:bg-white/10 rounded-lg transition"
                          title="Settings"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={() => handleDeleteShop(shop.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {isFormModalOpen && (
        <ShopFormModal shop={selectedShop} onClose={handleFormModalClose} />
      )}
      
      {/* Settings Modal Removed - Navigates to page now */}

      {/* Floating Add Shop button to ensure visibility */}
      <button
        onClick={handleCreateShop}
        disabled={isLimitReached}
        className={`fixed bottom-6 right-6 z-20 px-4 py-2 rounded-full shadow-lg font-medium transition ${
            isLimitReached 
                ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
                : "bg-teal-500 hover:bg-teal-600 text-white"
        }`}
        aria-label="Add Shop"
        title={isLimitReached ? "Limit Reached" : "Add Shop"}
      >
        {isLimitReached ? "Limit Reached" : "+ Add Shop"}
      </button>
    </div>
  );
}
