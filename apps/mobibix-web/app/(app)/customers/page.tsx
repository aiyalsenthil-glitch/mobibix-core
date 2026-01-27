"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listCustomers,
  deleteCustomer,
  type Customer,
} from "@/services/customers.api";
import { CustomerForm } from "./CustomerForm";
import { useTheme } from "@/context/ThemeContext";

export default function CustomersPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listCustomers();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
  };

  const handleDelete = async (customer: Customer) => {
    if (
      !confirm(
        `Are you sure you want to delete customer "${customer.name}"? This will mark them as inactive.`,
      )
    ) {
      return;
    }

    try {
      await deleteCustomer(customer.id);
      setCustomers(customers.filter((c) => c.id !== customer.id));
    } catch (err: any) {
      alert(err.message || "Failed to delete customer");
    }
  };

  const handleFormClose = () => {
    setIsAddModalOpen(false);
    setEditingCustomer(null);
    loadCustomers();
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm),
  );

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-black"}`}>
              Customers
            </h1>
            <p className={`mt-1 ${theme === "dark" ? "text-stone-400" : "text-gray-600"}`}>
              Manage your customer database
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition"
          >
            + Add Customer
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${
            theme === "dark"
              ? "bg-red-500/20 border border-red-500/50 text-red-300"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {error}
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-teal-500 ${
              theme === "dark"
                ? "bg-white/10 border-white/20 text-white placeholder-stone-400"
                : "bg-white border-gray-300 text-black placeholder-gray-500"
            }`}
          />
        </div>

        {/* Customers Table */}
        {isLoading ? (
          <div className={`text-center py-12 ${theme === "dark" ? "text-stone-400" : "text-gray-600"}`}>
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className={`text-center py-12 ${theme === "dark" ? "text-stone-400" : "text-gray-600"}`}>
            {searchTerm
              ? "No customers found matching your search"
              : "No customers yet. Click '+ Add Customer' to create one."}
          </div>
        ) : (
          <div className={`overflow-x-auto rounded-lg border ${
            theme === "dark" ? "border-white/10" : "border-gray-200"
          }`}>
            <table className="w-full">
              <thead>
                <tr className={`border-b ${
                  theme === "dark" ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
                }`}>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    theme === "dark" ? "text-stone-300" : "text-gray-700"
                  }`}>
                    Name
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    theme === "dark" ? "text-stone-300" : "text-gray-700"
                  }`}>
                    Phone
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    theme === "dark" ? "text-stone-300" : "text-gray-700"
                  }`}>
                    State
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    theme === "dark" ? "text-stone-300" : "text-gray-700"
                  }`}>
                    Loyalty Points
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    theme === "dark" ? "text-stone-300" : "text-gray-700"
                  }`}>
                    Status
                  </th>
                  <th className={`px-6 py-4 text-right text-sm font-semibold ${
                    theme === "dark" ? "text-stone-300" : "text-gray-700"
                  }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, idx) => (
                  <tr
                    key={customer.id}
                    className={`border-b ${
                      theme === "dark" ? "border-white/5" : "border-gray-200"
                    } ${
                      !customer.isActive
                        ? theme === "dark"
                          ? "bg-white/5 opacity-60"
                          : "bg-gray-50 opacity-60"
                        : idx % 2 === 0
                          ? "bg-transparent"
                          : theme === "dark"
                            ? "bg-white/2"
                            : "bg-gray-50/50"
                    }`}
                  >
                    <td
                      className={`px-6 py-4 text-sm ${
                        !customer.isActive
                          ? theme === "dark"
                            ? "text-stone-500 line-through"
                            : "text-gray-500 line-through"
                          : theme === "dark"
                            ? "text-white"
                            : "text-gray-900"
                      }`}
                    >
                      {customer.name}
                    </td>
                    <td className={`px-6 py-4 text-sm ${
                      theme === "dark" ? "text-stone-300" : "text-gray-700"
                    }`}>
                      {customer.phone}
                    </td>
                    <td className={`px-6 py-4 text-sm ${
                      theme === "dark" ? "text-stone-300" : "text-gray-700"
                    }`}>
                      {customer.state}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        theme === "dark"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {customer.loyaltyPoints} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          customer.isActive
                            ? theme === "dark"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-green-100 text-green-700"
                            : theme === "dark"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                            theme === "dark"
                              ? "bg-teal-500/20 hover:bg-teal-500/30 text-teal-300"
                              : "bg-teal-100 hover:bg-teal-200 text-teal-700"
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                            theme === "dark"
                              ? "bg-red-500/20 hover:bg-red-500/30 text-red-300"
                              : "bg-red-100 hover:bg-red-200 text-red-700"
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Customer Modal */}
        {(isAddModalOpen || editingCustomer) && (
          <CustomerForm customer={editingCustomer} onClose={handleFormClose} />
        )}
      </div>
    </div>
  );
}
