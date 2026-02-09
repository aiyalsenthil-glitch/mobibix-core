"use client";

import { useEffect, useState } from "react";
import { listShops, type Shop } from "@/services/shops.api";
import { ShopFormModal } from "./ShopFormModal";
import { useRouter } from "next/navigation";

import { getCurrentTenant, type CurrentTenantResponse } from "@/services/tenant.api";

  export default function ShopsPage() {
    const router = useRouter(); // Hook
    const [shops, setShops] = useState<Shop[]>([]);
    const [tenant, setTenant] = useState<CurrentTenantResponse | null>(null);
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
        const [shopsData, tenantData] = await Promise.all([
            listShops(),
            getCurrentTenant()
        ]);
        
        setShops(shopsData);
        setTenant(tenantData);
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
      // Navigate to new Settings Page
      router.push(`/shops/${shop.id}/settings`);
    };

    const handleFormModalClose = () => {
      setIsFormModalOpen(false);
      setSelectedShop(null);
      loadData(); // Reload both to ensure counts are accurate
    };

    // Calculate Limits
    const maxShops = tenant?.subscription?.plan?.maxShops ?? 1; // Default to 1 if unknown, though backend handles this
    const isLimitReached = maxShops !== null && shops.length >= maxShops;


  const handleDeleteShop = async (shopId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this shop? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      // Note: DELETE endpoint not yet implemented in backend
      alert("Delete functionality coming soon");
      // await deleteShop(shopId);
      // await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete shop");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold text-white">Shops</h1>
            {tenant?.subscription && (
                <p className="text-stone-400 text-sm mt-1">
                    Plan: <span className="text-teal-400 font-medium">{tenant.subscription.plan.name}</span> • 
                    Shops: <span className={isLimitReached ? "text-red-400" : "text-white"}>{shops.length}</span> / {maxShops === null ? "Unlimited" : maxShops}
                </p>
            )}
        </div>
        <button
          onClick={handleCreateShop}
          disabled={isLimitReached}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            isLimitReached 
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-teal-500 hover:bg-teal-600 text-white"
          }`}
          title={isLimitReached ? "Shop limit reached. Upgrade your plan." : "Add new shop"}
        >
          {isLimitReached ? "Limit Reached" : "+ Add Shop"}
        </button>
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
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Shop Name
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    City
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    GST
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {shop.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-400">
                      {shop.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-400">
                      {shop.city || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-400">
                      {shop.gstNumber ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                          {shop.gstNumber.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-stone-500">-</span>
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
