"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  listCustomersPaginated,
  deleteCustomer,
  type Customer,
} from "@/services/customers.api";
import { CustomerForm } from "./CustomerForm";
import { useTheme } from "@/context/ThemeContext";
import { CustomerTimelineDrawer } from "@/components/crm/CustomerTimelineDrawer";
import { AddFollowUpModal } from "@/components/crm/AddFollowUpModal";
import { type FollowUpType } from "@/services/crm.api";
import { CustomerTabs } from "@/components/crm/CustomerTabs";
import { CustomerLoyaltyBalance } from "./CustomerLoyaltyBalance";
import { ManualAdjustmentModal } from "./ManualAdjustmentModal";
import { LoyaltyHistoryDrawer } from "./LoyaltyHistoryDrawer";
import {
  Search,
  Plus,
  UserPlus,
  Clock,
  PhoneCall,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Star,
} from "lucide-react";

const PAGE_SIZE = 50;

export default function CustomersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // CRM Modals State
  const [timelineCustomerId, setTimelineCustomerId] = useState<string | null>(null);
  const [timelineCustomerName, setTimelineCustomerName] = useState<string>("");
  const [followUpData, setFollowUpData] = useState<{
    customerId: string;
    customerName: string;
    defaultPurpose: string;
    defaultType: FollowUpType;
  } | null>(null);
  const [adjustmentData, setAdjustmentData] = useState<{
    customerId: string;
    customerName: string;
  } | null>(null);

  // Loyalty history drawer
  const [loyaltyHistory, setLoyaltyHistory] = useState<{
    customerId: string;
    customerName: string;
    balance: number;
  } | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadCustomers = useCallback(async (page: number, search: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await listCustomersPaginated({
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        search: search || undefined,
      });
      setCustomers(response.data);
      setTotalCustomers(response.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch, loadCustomers]);

  const handleEdit = (customer: Customer) => setEditingCustomer(customer);

  const handleDelete = async (customer: Customer) => {
    if (
      !confirm(
        `Are you sure you want to delete "${customer.name}"? This will mark them as inactive.`
      )
    )
      return;
    try {
      await deleteCustomer(customer.id);
      loadCustomers(currentPage, debouncedSearch);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete customer");
    }
  };

  const handleFormClose = () => {
    setIsAddModalOpen(false);
    setEditingCustomer(null);
    loadCustomers(currentPage, debouncedSearch);
  };

  const totalPages = Math.ceil(totalCustomers / PAGE_SIZE);

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-stone-950" : "bg-gray-50"}`}>
      <div className="max-w-7xl mx-auto">
        <CustomerTabs />

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDark ? "bg-teal-500/15" : "bg-teal-50"}`}>
                <Users className={`w-5 h-5 ${isDark ? "text-teal-400" : "text-teal-600"}`} />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Customers
                </h1>
                <p className={`text-sm ${isDark ? "text-stone-400" : "text-gray-500"}`}>
                  {totalCustomers > 0
                    ? `${totalCustomers} customer${totalCustomers !== 1 ? "s" : ""} total`
                    : "Manage your customer database"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/35"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div
            className={`mb-5 px-4 py-3 rounded-xl text-sm ${
              isDark
                ? "bg-red-500/10 border border-red-500/30 text-red-400"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {error}
          </div>
        )}

        {/* ── Search Bar ── */}
        <div className="mb-5">
          <div className="relative">
            <Search
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                isDark ? "text-stone-500" : "text-gray-400"
              }`}
            />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all outline-none ${
                isDark
                  ? "bg-white/5 border-white/10 text-white placeholder:text-stone-600 focus:border-teal-500/50 focus:bg-white/8"
                  : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              }`}
            />
          </div>
        </div>

        {/* ── Table ── */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`h-14 rounded-xl animate-pulse ${isDark ? "bg-white/5" : "bg-gray-100"}`}
              />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed ${
              isDark ? "border-white/10 text-stone-500" : "border-gray-200 text-gray-400"
            }`}
          >
            <UserPlus className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-semibold">No customers found</p>
            <p className="text-sm mt-1">
              {searchTerm ? "Try a different search term" : "Add your first customer to get started"}
            </p>
          </div>
        ) : (
          <>
            <div
              className={`rounded-2xl border overflow-hidden ${
                isDark ? "bg-stone-900/60 border-white/8" : "bg-white border-gray-200"
              }`}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className={`border-b ${
                      isDark ? "border-white/8 bg-white/3" : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    {["Name", "Phone", "State", "Loyalty Points", "Status", "Actions"].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                          isDark ? "text-stone-500" : "text-gray-500"
                        } ${h === "Actions" ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={`group transition-colors ${
                        !customer.isActive
                          ? isDark
                            ? "opacity-50"
                            : "opacity-60"
                          : ""
                      } ${isDark ? "hover:bg-white/3" : "hover:bg-gray-50/80"}`}
                    >
                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                              isDark
                                ? "bg-teal-500/15 text-teal-400"
                                : "bg-teal-50 text-teal-600"
                            }`}
                          >
                            {customer.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <Link
                            href={`/customers/${customer.id}`}
                            className={`font-medium hover:text-teal-500 transition-colors ${
                              !customer.isActive
                                ? isDark
                                  ? "text-stone-500 line-through"
                                  : "text-gray-400 line-through"
                                : isDark
                                ? "text-white"
                                : "text-gray-900"
                            }`}
                          >
                            {customer.name}
                          </Link>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className={`px-5 py-3.5 tabular-nums ${isDark ? "text-stone-300" : "text-gray-700"}`}>
                        {customer.phone}
                      </td>

                      {/* State */}
                      <td className={`px-5 py-3.5 ${isDark ? "text-stone-400" : "text-gray-500"}`}>
                        {customer.state || "—"}
                      </td>

                      {/* Loyalty Points — clickable to open history */}
                      <td className="px-5 py-3.5">
                        <CustomerLoyaltyBalance
                          customerId={customer.id}
                          onClick={(balance) =>
                            setLoyaltyHistory({
                              customerId: customer.id,
                              customerName: customer.name,
                              balance,
                            })
                          }
                        />
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            customer.isActive
                              ? isDark
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-emerald-50 text-emerald-700"
                              : isDark
                              ? "bg-red-500/15 text-red-400"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              customer.isActive ? "bg-emerald-400" : "bg-red-400"
                            }`}
                          />
                          {customer.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {/* Timeline */}
                          <ActionBtn
                            title="View Timeline"
                            color="stone"
                            isDark={isDark}
                            onClick={() => {
                              setTimelineCustomerId(customer.id);
                              setTimelineCustomerName(customer.name);
                            }}
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </ActionBtn>

                          {/* Follow-up */}
                          <ActionBtn
                            title="Add Follow-up"
                            color="blue"
                            isDark={isDark}
                            onClick={() =>
                              setFollowUpData({
                                customerId: customer.id,
                                customerName: customer.name,
                                defaultPurpose: "Routine follow-up",
                                defaultType: "PHONE_CALL",
                              })
                            }
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </ActionBtn>

                          {/* Loyalty Adjust */}
                          <ActionBtn
                            title="Adjust Loyalty"
                            color="purple"
                            isDark={isDark}
                            onClick={() =>
                              setAdjustmentData({
                                customerId: customer.id,
                                customerName: customer.name,
                              })
                            }
                          >
                            <Star className="w-3.5 h-3.5" />
                          </ActionBtn>

                          {/* Divider */}
                          <div className={`w-px h-5 mx-0.5 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />

                          {/* Edit */}
                          <ActionBtn
                            title="Edit"
                            color="teal"
                            isDark={isDark}
                            onClick={() => handleEdit(customer)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </ActionBtn>

                          {/* Delete */}
                          <ActionBtn
                            title="Delete"
                            color="red"
                            isDark={isDark}
                            onClick={() => handleDelete(customer)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </ActionBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {totalCustomers > PAGE_SIZE && (
              <div
                className={`mt-4 flex items-center justify-between px-4 py-3 rounded-xl border ${
                  isDark ? "border-white/8 bg-white/3" : "border-gray-200 bg-white"
                }`}
              >
                <p className={`text-sm ${isDark ? "text-stone-400" : "text-gray-500"}`}>
                  Showing {currentPage * PAGE_SIZE + 1}–
                  {Math.min((currentPage + 1) * PAGE_SIZE, totalCustomers)} of {totalCustomers}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => currentPage > 0 && setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                      isDark ? "bg-white/8 hover:bg-white/15 text-stone-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className={`text-sm tabular-nums ${isDark ? "text-stone-300" : "text-gray-600"}`}>
                    {currentPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => currentPage < totalPages - 1 && setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                      isDark ? "bg-white/8 hover:bg-white/15 text-stone-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Modals / Drawers ── */}
        {(isAddModalOpen || editingCustomer) && (
          <CustomerForm customer={editingCustomer} onClose={handleFormClose} />
        )}

        <CustomerTimelineDrawer
          isOpen={!!timelineCustomerId}
          customerId={timelineCustomerId || ""}
          customerName={timelineCustomerName}
          onClose={() => {
            setTimelineCustomerId(null);
            setTimelineCustomerName("");
          }}
        />

        {followUpData && (
          <AddFollowUpModal
            isOpen={!!followUpData}
            customerId={followUpData.customerId}
            customerName={followUpData.customerName}
            defaultPurpose={followUpData.defaultPurpose}
            defaultType={followUpData.defaultType}
            onClose={() => setFollowUpData(null)}
            onSuccess={() => {}}
          />
        )}

        {adjustmentData && (
          <ManualAdjustmentModal
            customerId={adjustmentData.customerId}
            customerName={adjustmentData.customerName}
            onClose={() => setAdjustmentData(null)}
            onSuccess={() => {
              setAdjustmentData(null);
              loadCustomers(currentPage, debouncedSearch);
            }}
          />
        )}

        {loyaltyHistory && (
          <LoyaltyHistoryDrawer
            customerId={loyaltyHistory.customerId}
            customerName={loyaltyHistory.customerName}
            balance={loyaltyHistory.balance}
            onClose={() => setLoyaltyHistory(null)}
          />
        )}
      </div>
    </div>
  );
}

/* ── Reusable icon action button ── */
type BtnColor = "stone" | "blue" | "purple" | "teal" | "red";

const colorMap: Record<BtnColor, { dark: string; light: string }> = {
  stone: {
    dark: "bg-white/5 hover:bg-white/12 text-stone-400 hover:text-stone-200",
    light: "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700",
  },
  blue: {
    dark: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300",
    light: "bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700",
  },
  purple: {
    dark: "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300",
    light: "bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-700",
  },
  teal: {
    dark: "bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 hover:text-teal-300",
    light: "bg-teal-50 hover:bg-teal-100 text-teal-600 hover:text-teal-700",
  },
  red: {
    dark: "bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300",
    light: "bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700",
  },
};

function ActionBtn({
  children,
  title,
  color,
  isDark,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  color: BtnColor;
  isDark: boolean;
  onClick: () => void;
}) {
  const cls = isDark ? colorMap[color].dark : colorMap[color].light;
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-all ${cls}`}
    >
      {children}
    </button>
  );
}
