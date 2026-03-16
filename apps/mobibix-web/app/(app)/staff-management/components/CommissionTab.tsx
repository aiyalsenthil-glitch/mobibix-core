"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCheck,
} from "lucide-react";
import { listShops, type Shop } from "@/services/shops.api";
import {
  listCommissionRules,
  createCommissionRule,
  toggleCommissionRule,
  deleteCommissionRule,
  listEarnings,
  markEarningsPaid,
  type CommissionRule,
  type StaffEarning,
  type CreateCommissionRuleDto,
  type EarningStatus,
} from "@/services/commission.api";
import PageTabs from "@/components/layout/PageTabs";

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE_OF_SALE: "% of Sale",
  PERCENTAGE_OF_PROFIT: "% of Profit",
  FIXED_PER_ITEM: "Fixed per Item (₹)",
};

const SCOPE_LABELS: Record<string, string> = {
  ALL_STAFF: "All Staff",
  SPECIFIC_STAFF: "Specific Staff",
  SPECIFIC_ROLE: "Specific Role",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
};

function formatPaisa(paisa: number) {
  return `₹${(paisa / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function CommissionTab() {
  const [subTab, setSubTab] = useState("rules");
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState("");

  // Rules state
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm] = useState<CreateCommissionRuleDto>({
    shopId: "",
    name: "",
    applyTo: "ALL_STAFF",
    type: "PERCENTAGE_OF_SALE",
    value: 0,
  });
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  // Earnings state
  const [earnings, setEarnings] = useState<StaffEarning[]>([]);
  const [earningsTotal, setEarningsTotal] = useState(0);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<EarningStatus | "">("");
  const [selectedEarnings, setSelectedEarnings] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    listShops().then((s) => {
      setShops(s);
      if (s.length > 0) setSelectedShopId(s[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedShopId) return;
    setRuleForm((f) => ({ ...f, shopId: selectedShopId }));
    loadRules();
    loadEarnings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShopId]);

  useEffect(() => {
    if (!selectedShopId) return;
    loadEarnings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  const loadRules = async () => {
    if (!selectedShopId) return;
    setRulesLoading(true);
    try {
      const data = await listCommissionRules(selectedShopId);
      setRules(data);
    } finally {
      setRulesLoading(false);
    }
  };

  const loadEarnings = async () => {
    if (!selectedShopId) return;
    setEarningsLoading(true);
    try {
      const res = await listEarnings({
        shopId: selectedShopId,
        status: selectedStatus || undefined,
        limit: 100,
      });
      setEarnings(res.earnings);
      setEarningsTotal(res.total);
    } finally {
      setEarningsLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!ruleForm.name || !ruleForm.type || ruleForm.value <= 0) return;
    setRuleSubmitting(true);
    try {
      await createCommissionRule(ruleForm);
      setShowRuleForm(false);
      setRuleForm({
        shopId: selectedShopId,
        name: "",
        applyTo: "ALL_STAFF",
        type: "PERCENTAGE_OF_SALE",
        value: 0,
      });
      await loadRules();
    } finally {
      setRuleSubmitting(false);
    }
  };

  const handleToggle = async (rule: CommissionRule) => {
    await toggleCommissionRule(rule.id, !rule.isActive);
    await loadRules();
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Delete this commission rule?")) return;
    await deleteCommissionRule(ruleId);
    await loadRules();
  };

  const handleMarkPaid = async () => {
    if (!selectedEarnings.size) return;
    setMarking(true);
    try {
      await markEarningsPaid([...selectedEarnings]);
      setSelectedEarnings(new Set());
      await loadEarnings();
    } finally {
      setMarking(false);
    }
  };

  const toggleSelectEarning = (id: string) => {
    setSelectedEarnings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      {/* Shop selector */}
      {shops.length > 1 && (
        <div className="mb-4">
          <select
            className="border rounded px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600"
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <PageTabs
        tabs={[
          { id: "rules", label: "Rules" },
          { id: "earnings", label: "Earnings" },
        ]}
        activeTab={subTab}
        onChange={setSubTab}
      />

      <div className="mt-4">
        {/* ─── Rules Tab ────────────────────────────────────── */}
        {subTab === "rules" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Commission rules auto-calculate staff earnings on each invoice.
              </p>
              <button
                onClick={() => setShowRuleForm(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                <Plus size={16} /> Add Rule
              </button>
            </div>

            {showRuleForm && (
              <div className="border rounded-xl p-4 mb-6 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                <h3 className="font-semibold mb-4 text-gray-800 dark:text-white">
                  New Commission Rule
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Rule Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Staff 5%"
                      className="mt-1 w-full border rounded px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                      value={ruleForm.name}
                      onChange={(e) =>
                        setRuleForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Applies To
                    </label>
                    <select
                      className="mt-1 w-full border rounded px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                      value={ruleForm.applyTo}
                      onChange={(e) =>
                        setRuleForm((f) => ({
                          ...f,
                          applyTo: e.target.value as any,
                        }))
                      }
                    >
                      <option value="ALL_STAFF">All Staff</option>
                      <option value="SPECIFIC_STAFF">Specific Staff</option>
                      <option value="SPECIFIC_ROLE">Specific Role</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Commission Type
                    </label>
                    <select
                      className="mt-1 w-full border rounded px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                      value={ruleForm.type}
                      onChange={(e) =>
                        setRuleForm((f) => ({
                          ...f,
                          type: e.target.value as any,
                        }))
                      }
                    >
                      <option value="PERCENTAGE_OF_SALE">% of Sale</option>
                      <option value="PERCENTAGE_OF_PROFIT">% of Profit</option>
                      <option value="FIXED_PER_ITEM">Fixed per Item (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Value{" "}
                      {ruleForm.type === "FIXED_PER_ITEM"
                        ? "(₹ per item)"
                        : "(%)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={ruleForm.type !== "FIXED_PER_ITEM" ? 100 : undefined}
                      step="0.01"
                      className="mt-1 w-full border rounded px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                      value={ruleForm.value}
                      onChange={(e) =>
                        setRuleForm((f) => ({
                          ...f,
                          value: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      Category Filter (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Leave blank for all products"
                      className="mt-1 w-full border rounded px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                      value={ruleForm.category || ""}
                      onChange={(e) =>
                        setRuleForm((f) => ({
                          ...f,
                          category: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleCreateRule}
                    disabled={ruleSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {ruleSubmitting ? "Saving..." : "Save Rule"}
                  </button>
                  <button
                    onClick={() => setShowRuleForm(false)}
                    className="text-sm px-4 py-2 rounded-lg border dark:border-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {rulesLoading ? (
              <div className="text-center text-gray-400 py-8">Loading...</div>
            ) : rules.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                No commission rules yet. Add one to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between border rounded-xl p-4 dark:border-slate-700"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {rule.name}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            rule.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        {SCOPE_LABELS[rule.applyTo]} ·{" "}
                        {COMMISSION_TYPE_LABELS[rule.type]} ·{" "}
                        {rule.type === "FIXED_PER_ITEM"
                          ? `₹${rule.value}`
                          : `${rule.value}%`}
                        {rule.category ? ` · Category: ${rule.category}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(rule)}
                        className="text-gray-400 hover:text-blue-600"
                        title={rule.isActive ? "Deactivate" : "Activate"}
                      >
                        {rule.isActive ? (
                          <ToggleRight size={22} className="text-blue-500" />
                        ) : (
                          <ToggleLeft size={22} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Earnings Tab ─────────────────────────────────── */}
        {subTab === "earnings" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <select
                  className="border rounded px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600"
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value as EarningStatus | "")
                  }
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PAID">Paid</option>
                </select>
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  {earningsTotal} records
                </span>
              </div>
              {selectedEarnings.size > 0 && (
                <button
                  onClick={handleMarkPaid}
                  disabled={marking}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  <CheckCheck size={16} />
                  Mark {selectedEarnings.size} as Paid
                </button>
              )}
            </div>

            {earningsLoading ? (
              <div className="text-center text-gray-400 py-8">Loading...</div>
            ) : earnings.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                No earnings found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-slate-700 text-left text-gray-500 dark:text-slate-400">
                      <th className="pb-2 pr-4 w-8">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEarnings(
                                new Set(
                                  earnings
                                    .filter((e) => e.status !== "PAID")
                                    .map((e) => e.id)
                                )
                              );
                            } else {
                              setSelectedEarnings(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="pb-2 pr-4">Staff</th>
                      <th className="pb-2 pr-4">Invoice</th>
                      <th className="pb-2 pr-4">Rule</th>
                      <th className="pb-2 pr-4">Sale</th>
                      <th className="pb-2 pr-4">Earned</th>
                      <th className="pb-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-3 pr-4">
                          <input
                            type="checkbox"
                            disabled={e.status === "PAID"}
                            checked={selectedEarnings.has(e.id)}
                            onChange={() => toggleSelectEarning(e.id)}
                          />
                        </td>
                        <td className="py-3 pr-4 text-gray-800 dark:text-slate-200">
                          {e.staff?.name || e.staffId.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-4 text-gray-600 dark:text-slate-400">
                          {e.invoice?.invoiceNumber || "-"}
                        </td>
                        <td className="py-3 pr-4 text-gray-600 dark:text-slate-400">
                          {e.rule?.name || "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {formatPaisa(e.saleAmount)}
                        </td>
                        <td className="py-3 pr-4 font-medium text-green-700 dark:text-green-400">
                          {formatPaisa(e.earned)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status]}`}
                          >
                            {e.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
