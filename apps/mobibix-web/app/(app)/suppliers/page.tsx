"use client";

import { useEffect, useState } from "react";
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierOutstanding,
  getSupplierTransactions,
  type Supplier,
  type CreateSupplierDto,
  type SupplierOutstanding,
} from "@/services/suppliers.api";
import { useTheme } from "@/context/ThemeContext";
import { ChevronRight, X, ReceiptText, WalletCards, CreditCard, Building2, Phone, Mail, FileMinus, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SuppliersPage() {
  const { theme } = useTheme();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [outstanding, setOutstanding] = useState<
    Record<string, SupplierOutstanding>
  >({});
  
  // Details Panel State
  const [selectedSupplierForDetails, setSelectedSupplierForDetails] = useState<Supplier | null>(null);
  const [transactions, setTransactions] = useState<{purchases: any[], payments: any[]}>({ purchases: [], payments: [] });
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateSupplierDto>({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    gstin: "",
    notes: "",
    // SupplierProfile
    category: "",
    paymentDueDays: 30,
    creditLimit: 0,
    preferredCurrency: "INR",
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listSuppliers();
      setSuppliers(data);

      // Load outstanding for each supplier in parallel
      const outstandingPromises = data.map(async (supplier) => {
        try {
          const out = await getSupplierOutstanding(supplier.id);
          return { id: supplier.id, out };
        } catch (err) {
          console.error(`Failed to load outstanding for supplier ${supplier.id}:`, err);
          return { id: supplier.id, out: null };
        }
      });

      const outstandingResults = await Promise.all(outstandingPromises);
      const outstandingData: Record<string, SupplierOutstanding> = {};
      outstandingResults.forEach(res => {
        if (res.out) outstandingData[res.id] = res.out;
      });
      setOutstanding(outstandingData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
      } else {
        await createSupplier(formData);
      }
      setShowForm(false);
      setEditingSupplier(null);
      resetForm();
      loadSuppliers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save supplier");
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      gstin: supplier.gstin || "",
      notes: supplier.notes || "",
      category: supplier.category || "",
      paymentDueDays: supplier.paymentDueDays || 30,
      creditLimit: (supplier.creditLimit || 0) / 100, // Convert from Paisa
      preferredCurrency: supplier.preferredCurrency || "INR",
    });
    setShowForm(true);
  };

  const handleDelete = async (supplierId: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;

    try {
      await deleteSupplier(supplierId);
      loadSuppliers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete supplier");
    }
  };

  const handleOpenDetails = async (supplier: Supplier) => {
    setSelectedSupplierForDetails(supplier);
    setIsLoadingTx(true);
    try {
      const tx = await getSupplierTransactions(supplier.id);
      setTransactions(tx);
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setIsLoadingTx(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      gstin: "",
      notes: "",
      category: "",
      paymentDueDays: 30,
      creditLimit: 0,
      preferredCurrency: "INR",
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSupplier(null);
    resetForm();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className={`text-2xl font-bold ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Suppliers
            </h1>
            <p
              className={`text-sm ${
                theme === "dark" ? "text-stone-400" : "text-gray-600"
              }`}
            >
              Manage your supplier information and track outstanding balances
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-medium"
          >
            + Add Supplier
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
              className={`${
                theme === "dark" ? "bg-gray-900" : "bg-white"
              } rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
            >
              <h2
                className={`text-xl font-bold mb-4 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactPerson: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-700 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-700 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    rows={3}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) =>
                      setFormData({ ...formData, gstin: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={2}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>

                <div className="border-t border-dashed border-gray-700 pt-4 mt-4">
                   <h3 className="text-sm font-bold opacity-50 mb-4 uppercase tracking-wider">Advanced Profile</h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1 opacity-70">Category</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                        >
                          <option value="">-- Select --</option>
                          <option value="Tier-1">Tier-1 (Priority)</option>
                          <option value="Tier-2">Tier-2</option>
                          <option value="Wholesaler">Wholesaler</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 opacity-70">Preferred Currency</label>
                        <select
                          value={formData.preferredCurrency}
                          onChange={(e) => setFormData({ ...formData, preferredCurrency: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 opacity-70">Payment Due (Days)</label>
                        <input
                          type="number"
                          value={formData.paymentDueDays}
                          onChange={(e) => setFormData({ ...formData, paymentDueDays: parseInt(e.target.value) || 0 })}
                          className={`w-full px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 opacity-70">Credit Limit (₹)</label>
                        <input
                          type="number"
                          value={formData.creditLimit}
                          onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                          className={`w-full px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                        />
                      </div>
                   </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-medium"
                  >
                    {editingSupplier ? "Update Supplier" : "Create Supplier"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
                      theme === "dark"
                        ? "bg-gray-800 hover:bg-gray-700 text-white"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Suppliers List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            <p
              className={`mt-4 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Loading suppliers...
            </p>
          </div>
        ) : suppliers.length === 0 ? (
          <div
            className={`text-center py-12 ${
              theme === "dark"
                ? "bg-gray-900 border-gray-800"
                : "bg-white border-gray-200"
            } rounded-lg border`}
          >
            <p
              className={`${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              No suppliers yet. Click &quot;Add Supplier&quot; to get started.
            </p>
          </div>
        ) : (
          <div className={`overflow-hidden rounded-xl border ${theme === "dark" ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className={`border-b ${theme === "dark" ? "border-gray-800 bg-gray-800/50 text-gray-400" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
                  <tr>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Supplier Info</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Contact</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">GSTIN</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-right">Outstanding</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === "dark" ? "divide-gray-800" : "divide-gray-200"}`}>
                  {suppliers.map((supplier) => (
                    <tr 
                      key={supplier.id} 
                      className={`group hover:bg-teal-500/5 transition-colors cursor-pointer ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                      onClick={() => handleOpenDetails(supplier)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${theme === "dark" ? "bg-gray-800 text-teal-400" : "bg-teal-50 text-teal-600"}`}>
                            {supplier.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{supplier.name}</p>
                            <p className="text-xs opacity-70 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3"/> {supplier.category || "Vendor"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex flex-col gap-1">
                           {supplier.phone && <span className="flex items-center gap-1.5 text-sm"><Phone className="w-3.5 h-3.5 opacity-60"/> {supplier.phone}</span>}
                           {supplier.email && <span className="flex items-center gap-1.5 text-sm"><Mail className="w-3.5 h-3.5 opacity-60"/> {supplier.email}</span>}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         {supplier.gstin ? (
                            <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                              {supplier.gstin}
                            </span>
                         ) : <span className="text-xs opacity-50">N/A</span>}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {outstanding[supplier.id]?.totalOutstanding > 0 ? (
                          <span className="text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md text-sm">
                            ₹{outstanding[supplier.id].totalOutstanding.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md text-sm">
                             ₹0.00
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(supplier); }}
                            className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-gray-800 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"}`}
                          >
                            Edit
                          </button>
                          <ChevronRight className={`w-5 h-5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Details Side Panel */}
        {selectedSupplierForDetails && (
          <>
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" 
              onClick={() => setSelectedSupplierForDetails(null)} 
            />
            <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] z-50 shadow-2xl flex flex-col transform transition-transform ${theme === "dark" ? "bg-gray-900 border-l border-gray-800" : "bg-white border-l border-gray-200"}`}>
               {/* Header */}
               <div className={`px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10 ${theme === "dark" ? "border-gray-800 bg-gray-900/95" : "border-gray-200 bg-white/95"} backdrop-blur`}>
                 <div>
                   <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{selectedSupplierForDetails.name}</h2>
                   <p className="text-sm opacity-70 mt-0.5">Supplier Details & Transactions</p>
                 </div>
                 <button 
                   onClick={() => setSelectedSupplierForDetails(null)}
                   className={`p-2 rounded-full ${theme === "dark" ? "hover:bg-gray-800 bg-gray-800/50" : "hover:bg-gray-100 bg-gray-100/50"} transition-colors`}
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>

               {/* Content */}
               <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Overview Cards */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className={`p-4 rounded-xl border ${theme === "dark" ? "bg-gray-800/30 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                        <div className="flex items-center gap-2 mb-2 opacity-70 text-sm">
                           <WalletCards className="w-4 h-4" /> Outstanding
                        </div>
                        <div className={`text-2xl font-bold ${outstanding[selectedSupplierForDetails.id]?.totalOutstanding > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                           ₹{outstanding[selectedSupplierForDetails.id]?.totalOutstanding?.toFixed(2) || "0.00"}
                        </div>
                     </div>
                     <div className={`p-4 rounded-xl border ${theme === "dark" ? "bg-gray-800/30 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                        <div className="flex items-center gap-2 mb-2 opacity-70 text-sm">
                           <CreditCard className="w-4 h-4" /> Credit Limit
                        </div>
                        <div className="text-2xl font-bold">
                           {selectedSupplierForDetails.creditLimit ? `₹${selectedSupplierForDetails.creditLimit.toFixed(2)}` : "No Limit"}
                        </div>
                     </div>
                  </div>

                  {/* Transactions Tabs / Content */}
                  <div>
                    <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 opacity-50`}>Recent Purchases</h3>
                    {isLoadingTx ? (
                        <div className="py-8 text-center text-sm opacity-60">Loading...</div>
                    ) : transactions.purchases.length === 0 ? (
                        <div className={`p-8 text-center rounded-xl border border-dashed ${theme === "dark" ? "border-gray-800 bg-gray-800/20" : "border-gray-200 bg-gray-50"}`}>
                           <ReceiptText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                           <p className="text-sm opacity-60">No recent purchases found.</p>
                        </div>
                    ) : (
                        <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
                           <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm">
                              <thead className={`border-b ${theme === "dark" ? "border-gray-800 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                                 <tr>
                                    <th className="p-3 font-medium">Inv #</th>
                                    <th className="p-3 font-medium">Date</th>
                                    <th className="p-3 font-medium text-right">Amount</th>
                                 </tr>
                              </thead>
                              <tbody className={`divide-y ${theme === "dark" ? "divide-gray-800" : "divide-gray-200"}`}>
                                 {transactions.purchases.map(p => (
                                    <tr key={p.id} className={theme === "dark" ? "hover:bg-gray-800/30" : "hover:bg-gray-50"}>
                                       <td className="p-3 font-medium text-teal-500">#{p.invoiceNumber.split('-').pop()}</td>
                                       <td className="p-3 opacity-80">{new Date(p.invoiceDate).toLocaleDateString()}</td>
                                       <td className="p-3 text-right font-semibold">₹{(p.grandTotal / 100).toFixed(2)}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                           </div>
                        </div>
                    )}
                  </div>

                  <div>
                    <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 opacity-50 flex items-center justify-between`}>
                      <span>Recent Payments</span>
                      {selectedSupplierForDetails.paymentDueDays ? <span className="text-xs normal-case opacity-70">Terms: Net {selectedSupplierForDetails.paymentDueDays}</span> : null}
                    </h3>
                    {isLoadingTx ? (
                        <div className="py-8 text-center text-sm opacity-60">Loading...</div>
                    ) : transactions.payments.length === 0 ? (
                        <div className={`p-8 text-center rounded-xl border border-dashed ${theme === "dark" ? "border-gray-800 bg-gray-800/20" : "border-gray-200 bg-gray-50"}`}>
                           <WalletCards className="w-8 h-8 mx-auto mb-3 opacity-20" />
                           <p className="text-sm opacity-60">No recent payments found.</p>
                        </div>
                    ) : (
                        <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
                           <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm">
                              <thead className={`border-b ${theme === "dark" ? "border-gray-800 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                                 <tr>
                                    <th className="p-3 font-medium">Date</th>
                                    <th className="p-3 font-medium">Mode</th>
                                    <th className="p-3 font-medium text-right">Amount</th>
                                 </tr>
                              </thead>
                              <tbody className={`divide-y ${theme === "dark" ? "divide-gray-800" : "divide-gray-200"}`}>
                                 {transactions.payments.map(p => (
                                    <tr key={p.id} className={theme === "dark" ? "hover:bg-gray-800/30" : "hover:bg-gray-50"}>
                                       <td className="p-3 opacity-80">{new Date(p.paymentDate).toLocaleDateString()}</td>
                                       <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500`}>{p.paymentMethod}</span></td>
                                       <td className="p-3 text-right font-semibold text-emerald-500">₹{(p.amount / 100).toFixed(2)}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                           </div>
                        </div>
                    )}
                  </div>

                  <div className={`mt-8 p-4 rounded-xl border bg-primary/5 border-primary/20 flex gap-4 items-start`}>
                      <FileMinus className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">Supplier Credit Notes</h4>
                        <p className="text-xs opacity-70 mt-1">Manage purchase returns, price corrections, and supplier credit adjustments.</p>
                        <Link
                          href={`/credit-notes?type=SUPPLIER`}
                          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:underline"
                        >
                          View Credit Notes <ArrowRight size={11} />
                        </Link>
                      </div>
                  </div>

               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
