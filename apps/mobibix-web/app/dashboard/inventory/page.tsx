"use client";

import { useState } from "react";
import { InventoryList } from "@/components/inventory/InventoryList";
import { LowStockAlerts } from "@/components/inventory/LowStockAlerts";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";

import { useShop } from "@/context/ShopContext";
import { type ShopProduct } from "@/services/products.api";

export default function InventoryPage() {
  const { selectedShopId } = useShop();
  const [activeTab, setActiveTab] = useState("stock-levels");
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenAdjustment = (product: ShopProduct) => {
    setSelectedProduct(product);
    setAdjustmentModalOpen(true);
  };

  const handleAdjustmentSuccess = () => {
    setAdjustmentModalOpen(false);
    setSelectedProduct(null);
    setRefreshKey((prev) => prev + 1);
  };

  const tabs = [
    { id: "stock-levels", label: "Stock Levels", icon: "📦" },
    { id: "low-stock", label: "Low Stock Alerts", icon: "⚠️" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Inventory Management
        </h1>
        <p className="mt-2 text-gray-600">
          Manage stock levels, track low stock items, and adjust inventory
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "stock-levels" && (
        <InventoryList
          key={`stock-levels-${refreshKey}`}
          shopId={selectedShopId || ""}
          onAdjustStock={handleOpenAdjustment}
        />
      )}

      {activeTab === "low-stock" && (
        <LowStockAlerts
          key={`low-stock-${refreshKey}`}
          shopId={selectedShopId || ""}
          onAdjustStock={handleOpenAdjustment}
        />
      )}

      {/* Stock Adjustment Modal */}
      {selectedProduct && (
        <StockAdjustmentModal
          product={selectedProduct}
          shopId={selectedShopId || ""}
          isOpen={adjustmentModalOpen}
          onClose={() => {
            setAdjustmentModalOpen(false);
            setSelectedProduct(null);
          }}
          onSuccess={handleAdjustmentSuccess}
        />
      )}
    </div>
  );
}
