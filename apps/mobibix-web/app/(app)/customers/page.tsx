"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listCustomers,
  deleteCustomer,
  type Customer,
} from "@/services/customers.api";
import { CustomerForm } from "./CustomerForm";

export default function CustomersPage() {
  const router = useRouter();
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
    <div className="min-h-screen bg-stone-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Customers</h1>
            <p className="text-stone-400 mt-1">Manage your customer database</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium"
          >
            + Add Customer
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
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
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-stone-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Customers Table */}
        {isLoading ? (
          <div className="text-center py-12 text-stone-400">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            {searchTerm
              ? "No customers found matching your search"
              : "No customers yet. Click '+ Add Customer' to create one."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-stone-300">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-stone-300">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-stone-300">
                    State
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-stone-300">
                    Loyalty Points
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-stone-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-stone-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, idx) => (
                  <tr
                    key={customer.id}
                    className={`border-b border-white/5 ${
                      !customer.isActive
                        ? "bg-white/5 opacity-60"
                        : idx % 2 === 0
                          ? "bg-transparent"
                          : "bg-white/2"
                    }`}
                  >
                    <td
                      className={`px-6 py-4 text-sm ${
                        !customer.isActive
                          ? "text-stone-500 line-through"
                          : "text-white"
                      }`}
                    >
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-300">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-300">
                      {customer.state}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                        {customer.loyaltyPoints} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          customer.isActive
                            ? "bg-green-500/20 text-green-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="px-3 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
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
