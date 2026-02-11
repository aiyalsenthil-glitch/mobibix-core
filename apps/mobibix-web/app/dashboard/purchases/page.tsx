"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listPurchases,
  type Purchase,
  type PurchaseStatus,
} from "@/services/purchases.api";
import { listShops, type Shop } from "@/services/shops.api";
import { SupplierPaymentModal } from "@/components/purchases/SupplierPaymentModal";
import { CancelPurchaseModal } from "@/components/purchases/CancelPurchaseModal";

const STATUS_COLORS: Record<PurchaseStatus, string> = {
  DRAFT: "bg-gray-500/15 text-gray-400",
  SUBMITTED: "bg-teal-500/15 text-teal-400",
  PARTIALLY_PAID: "bg-amber-500/15 text-amber-400",
  PAID: "bg-green-500/15 text-green-400",
  CANCELLED: "bg-red-500/15 text-red-400",
};

export default function PurchasesPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );

  useEffect(() => {
    const loadShops = async () => {
      try {
        const data = await listShops();
        setShops(data);
        if (data.length > 0) setSelectedShopId(data[0].id);
      } catch (err: any) {
        setError(err.message || "Failed to load shops");
      }
    };
    loadShops();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      void loadPurchases();
    }
  }, [selectedShopId]);

  const loadPurchases = async () => {
    if (!selectedShopId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await listPurchases({ shopId: selectedShopId });
      setPurchases(data);
    } catch (err: any) {
      setError(err.message || "Failed to load purchases");
      setPurchases([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePurchase = () => {
    router.push("/dashboard/purchases/create");
  };

  const handlePaymentClick = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setPaymentModalOpen(true);
  };

  const handleCancelClick = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setCancelModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    setSelectedPurchase(null);
    void loadPurchases();
  };

  const handleCancelSuccess = () => {
    setCancelModalOpen(false);
    setSelectedPurchase(null);
    void loadPurchases();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchases</h1>
          <p className="mt-2 text-gray-600">
            Manage supplier purchases and payments
          </p>
        </div>
        <button
          onClick={handleCreatePurchase}
          disabled={!selectedShopId}
          className="px-6 py-2 bg-linear-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition shadow-lg"
        >
          + Create Purchase
        </button>
      </div>

      {/* Shop Selector */}
      <div className="flex items-center gap-4 mb-6">
        <label className="text-sm font-medium text-gray-700">Shop:</label>
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

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-teal-600" />
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No purchases found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {purchase.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {purchase.supplierName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(purchase.invoiceDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{purchase.grandTotal.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    ₹{purchase.paidAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                    ₹{purchase.outstandingAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[purchase.status]}`}
                    >
                      {purchase.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {purchase.outstandingAmount > 0 &&
                      purchase.status !== "CANCELLED" && (
                        <button
                          onClick={() => handlePaymentClick(purchase)}
                          className="text-teal-600 hover:text-teal-900"
                        >
                          Pay
                        </button>
                      )}
                    {purchase.status !== "CANCELLED" && (
                      <button
                        onClick={() => handleCancelClick(purchase)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Modal */}
      {selectedPurchase && (
        <SupplierPaymentModal
          purchaseId={selectedPurchase.id}
          balanceAmount={selectedPurchase.outstandingAmount}
          supplierName={selectedPurchase.supplierName}
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Cancel Modal */}
      {selectedPurchase && (
        <CancelPurchaseModal
          purchaseId={selectedPurchase.id}
          invoiceNumber={selectedPurchase.invoiceNumber}
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
}
