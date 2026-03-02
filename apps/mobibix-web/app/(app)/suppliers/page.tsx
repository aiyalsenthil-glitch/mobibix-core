"use client";

import { useEffect, useState } from "react";
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierOutstanding,
  type Supplier,
  type CreateSupplierDto,
  type SupplierOutstanding,
} from "@/services/suppliers.api";
import { useTheme } from "@/context/ThemeContext";

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

      // Load outstanding for each supplier
      const outstandingData: Record<string, SupplierOutstanding> = {};
      for (const supplier of data) {
        try {
          const out = await getSupplierOutstanding(supplier.id);
          outstandingData[supplier.id] = out;
        } catch (err) {
          console.error(
            `Failed to load outstanding for supplier ${supplier.id}:`,
            err,
          );
        }
      }
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className={`p-4 rounded-lg border ${
                  theme === "dark"
                    ? "bg-gray-900 border-gray-800"
                    : "bg-white border-gray-200"
                } hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3
                      className={`font-semibold ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {supplier.name}
                    </h3>
                    {supplier.contactPerson && (
                      <p
                        className={`text-sm ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {supplier.contactPerson}
                      </p>
                    )}
                  </div>
                  {outstanding[supplier.id]?.totalOutstanding > 0 && (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded">
                      ₹{outstanding[supplier.id].totalOutstanding.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="space-y-1 mb-4">
                  {supplier.phone && (
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      📞 {supplier.phone}
                    </p>
                  )}
                  {supplier.email && (
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      ✉️ {supplier.email}
                    </p>
                  )}
                  {supplier.gstin && (
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      GST: {supplier.gstin}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="flex-1 px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="flex-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
