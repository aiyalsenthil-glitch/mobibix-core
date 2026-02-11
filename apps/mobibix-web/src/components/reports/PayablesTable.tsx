"use client";

import { useState, useEffect } from "react";
import { listPurchases, type Purchase } from "@/services/purchases.api";
import { SupplierPaymentModal } from "@/components/purchases/SupplierPaymentModal";

interface PayablesTableProps {
  shopId: string;
}

export function PayablesTable({ shopId }: PayablesTableProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    "dueDate" | "balanceAmount" | "daysOverdue"
  >("dueDate");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );

  useEffect(() => {
    if (shopId) {
      loadPendingPurchases();
    }
  }, [shopId]);

  const loadPendingPurchases = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listPurchases({
        shopId,
        status: "PARTIALLY_PAID", // This will need backend support for filtering
      });
      // Filter for purchases with outstanding amounts
      const pending = data.filter(
        (p) => p.outstandingAmount > 0 && p.status !== "CANCELLED",
      );
      setPurchases(pending);
    } catch (err: any) {
      setError(err.message || "Failed to load pending purchases");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDaysOverdue = (dueDate?: string | Date) => {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.floor(
      (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(0, diff);
  };

  const sortedPurchases = [...purchases].sort((a, b) => {
    if (sortBy === "dueDate") {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateA - dateB;
    } else if (sortBy === "balanceAmount") {
      return b.outstandingAmount - a.outstandingAmount;
    } else {
      const daysA = calculateDaysOverdue(a.dueDate);
      const daysB = calculateDaysOverdue(b.dueDate);
      return daysB - daysA;
    }
  });

  const totals = {
    totalPayables: purchases.reduce((sum, p) => sum + p.outstandingAmount, 0),
    totalOverdue: purchases
      .filter((p) => calculateDaysOverdue(p.dueDate) > 0)
      .reduce((sum, p) => sum + p.outstandingAmount, 0),
  };

  const handlePayClick = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    setSelectedPurchase(null);
    loadPendingPurchases();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-linear-to-br from-red-50 to-red-100 border border-red-200 p-4">
          <h3 className="text-sm font-medium text-gray-700">Total Payables</h3>
          <p className="text-2xl font-bold text-red-600 mt-1">
            ₹{totals.totalPayables.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-linear-to-br from-amber-50 to-amber-100 border border-amber-200 p-4">
          <h3 className="text-sm font-medium text-gray-700">Total Overdue</h3>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            ₹{totals.totalOverdue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Sort by:</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="dueDate">Due Date</option>
          <option value="balanceAmount">Balance Amount</option>
          <option value="daysOverdue">Days Overdue</option>
        </select>
      </div>

      {/* Table */}
      {sortedPurchases.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No pending payables</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Overdue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPurchases.map((purchase) => {
                const daysOverdue = calculateDaysOverdue(purchase.dueDate);
                const isOverdue = daysOverdue > 0;
                return (
                  <tr
                    key={purchase.id}
                    className={`hover:bg-gray-50 ${isOverdue ? "bg-red-50" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {purchase.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.supplierName}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {purchase.dueDate
                        ? new Date(purchase.dueDate).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isOverdue ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {daysOverdue} days
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handlePayClick(purchase)}
                        className="text-teal-600 hover:text-teal-900"
                      >
                        Pay Now
                      </button>
                    </td>
                  </tr>
                );
              })}
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
    </div>
  );
}
