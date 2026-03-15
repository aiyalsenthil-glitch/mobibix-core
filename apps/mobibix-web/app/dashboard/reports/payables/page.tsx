"use client";

import { useState, useEffect } from "react";
import { listShops, type Shop } from "@/services/shops.api";
import { PayablesTable } from "@/components/reports/PayablesTable";
import { PayablesAgingChart } from "@/components/reports/PayablesAgingChart";

export default function PayablesReportPage() {
  const [activeTab, setActiveTab] = useState<"list" | "aging">("list");
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadShops = async () => {
      try {
        setIsLoadingShops(true);
        const data = await listShops();
        setShops(data);
        if (data.length > 0) setSelectedShopId(data[0].id);
      } catch (err: any) {
        setError(err.message || "Failed to load shops");
      } finally {
        setIsLoadingShops(false);
      }
    };
    loadShops();
  }, []);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Supplier Payables</h1>
        <p className="mt-2 text-gray-600">
          Track pending supplier payments and aging analysis
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("list")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "list"
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            📋 Pending Payables
          </button>
          <button
            onClick={() => setActiveTab("aging")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "aging"
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            📊 Aging Analysis
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "list" && (
        <>
          {isLoadingShops ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-teal-600" />
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Shop:
                </label>
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedShopId && <PayablesTable shopId={selectedShopId} />}
            </>
          )}
        </>
      )}

      {activeTab === "aging" && <PayablesAgingChart />}
    </div>
  );
}
