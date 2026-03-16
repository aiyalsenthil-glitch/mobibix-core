"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Plus,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  Sparkles,
  Search,
  ChevronLeft,
} from "lucide-react";
import { listShops, type Shop } from "@/services/shops.api";
import {
  listTradeIns,
  createTradeIn,
  updateTradeInStatus,
  updateTradeInOffer,
  autoGradeDevice,
  addTradeInToInventory,
  issueCreditVoucher,
  completePayout,
  type TradeIn,
  type TradeInGrade,
  type CreateTradeInDto,
  type AutoGradeResult,
  type TradeInVoucher,
} from "@/services/tradein.api";
import { HelpGuide } from "@/components/common/HelpGuide";
import { PartySelector } from "@/components/common/PartySelector";
import { DeviceModelSelector } from "@/components/common/DeviceModelSelector";
import type { Party } from "@/services/parties.api";
import { getPriceIntel, type PriceIntel } from "@/services/tradein.api";

const TRADEIN_GUIDE = [
  {
    title: "What is Trade-In / Buyback?",
    description: "When a customer wants to sell their old phone, you create a Trade-In record. Assess the device, offer a price, and if accepted, apply the value as a credit toward their new purchase.",
    tip: "Trade-ins increase your new phone sales close rate — customers are more likely to upgrade when they get value for their old device.",
  },
  {
    title: "Step 1: Record device details",
    description: "Click 'New Trade-in'. Fill in the customer's name, phone number, device brand, model, IMEI, and storage. IMEI helps prevent accepting stolen devices.",
    tip: "Always record the IMEI. Cross-check with CEIR (ceir.sancharsaathi.gov.in) if suspicious.",
  },
  {
    title: "Step 2: Complete the condition checklist",
    description: "Tick all 10 condition checks: screen cracked, water damage, battery issue, body damage, and whether camera/charging/WiFi/speaker/mic/fingerprint are working.",
    tip: "Be honest about condition. Overpaying for a damaged phone that needs ₹4,000 in repairs kills your margin.",
  },
  {
    title: "Step 3: Auto-Grade & get a suggested offer",
    description: "Enter the current market value of the phone (check OLX or Cashify). Click 'Auto-Grade & Suggest Offer' — the AI scores the device and suggests a fair buyback price.",
    tip: "The suggestion is based on condition score: EXCELLENT=80%, GOOD=65%, FAIR=50%, POOR=30% of market value.",
  },
  {
    title: "Accept and link to a new invoice",
    description: "Present the offer. If the customer accepts, update status to ACCEPTED. When they buy a new phone, link the trade-in — the buyback value becomes a discount on their invoice.",
    tip: "Status flow: DRAFT → OFFERED → ACCEPTED → COMPLETED. Rejected? Mark REJECTED and record why.",
  },
];

// ─── Condition checks master list ─────────────────────────────────────────────
const CONDITION_CHECKS = [
  { key: "screenCracked", label: "Screen Cracked" },
  { key: "bodyDamaged", label: "Body/Frame Damaged" },
  { key: "cameraWorking", label: "Camera Working" },
  { key: "chargingWorking", label: "Charging Port Working" },
  { key: "speakerWorking", label: "Speaker Working" },
  { key: "micWorking", label: "Mic Working" },
  { key: "fingerprintWorking", label: "Fingerprint Working" },
  { key: "wifiWorking", label: "WiFi Working" },
  { key: "simWorking", label: "SIM Working" },
  { key: "batteryHealthGood", label: "Battery Health Good (>80%)" },
];

const GRADE_LABELS: Record<TradeInGrade, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  OFFERED: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  COMPLETED: "bg-green-100 text-green-700",
};

// ─── Wizard Steps ──────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              i < current
                ? "bg-green-500 text-white"
                : i === current
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {i < current ? <CheckCircle2 size={16} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`h-0.5 w-8 ${i < current ? "bg-green-400" : "bg-gray-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Price Intel Banner ────────────────────────────────────────────────────────

function PriceIntelBanner({
  priceIntel,
  brand,
  model,
  storage,
  onFetch,
  onUseMarketValue,
}: {
  priceIntel: PriceIntel | null;
  brand: string;
  model: string;
  storage?: string;
  onFetch: (p: PriceIntel | null) => void;
  onUseMarketValue: (v: number) => void;
}) {
  const [fetching, setFetching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleFetch = async () => {
    if (!brand || !model) return;
    setFetching(true);
    setSearched(true);
    try {
      const result = await getPriceIntel(brand, model, storage);
      onFetch(result);
    } finally {
      setFetching(false);
    }
  };

  if (priceIntel && priceIntel.count > 0) {
    const isCrowd = priceIntel.dataSource === "CROWD";
    const sourceLabel = isCrowd
      ? `${priceIntel.count} real buyback${priceIntel.count > 1 ? "s" : ""} across shops`
      : "Cashify market baseline";

    return (
      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1">
            <Sparkles size={12} /> {sourceLabel}
          </p>
          <span className="text-xs text-teal-500 dark:text-teal-500">{brand} {model}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mb-2">
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">Avg Offer</p>
            <p className="text-sm font-bold text-teal-700 dark:text-teal-300">₹{priceIntel.avgOffer.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">Range</p>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
              ₹{priceIntel.minOffer.toLocaleString("en-IN")}–{priceIntel.maxOffer.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">Avg Market</p>
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400">₹{priceIntel.avgMarketValue.toLocaleString("en-IN")}</p>
          </div>
        </div>
        {priceIntel.avgMarketValue > 0 && (
          <button
            type="button"
            onClick={() => onUseMarketValue(priceIntel.avgMarketValue)}
            className="w-full text-xs bg-teal-600 hover:bg-teal-700 text-white rounded py-1.5 font-medium transition-colors"
          >
            Use ₹{priceIntel.avgMarketValue.toLocaleString("en-IN")} as Market Value
          </button>
        )}
      </div>
    );
  }

  if (searched && !fetching && (!priceIntel || priceIntel.count === 0)) {
    return (
      <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex items-center gap-2">
        <Sparkles size={14} className="text-gray-400" />
        <p className="text-xs text-gray-500 dark:text-slate-400">
          No past buyback data for <strong>{brand} {model}</strong>. Enter market value manually below.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleFetch}
      disabled={fetching || !brand || !model}
      className="w-full flex items-center justify-center gap-2 border border-dashed border-teal-400 dark:border-teal-600 text-teal-600 dark:text-teal-400 rounded-lg py-2.5 text-sm font-medium hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-40 transition-colors"
    >
      <Sparkles size={14} />
      {fetching ? "Fetching shop history..." : "Fetch Market Value from Shop History"}
    </button>
  );
}

// ─── Create Wizard ─────────────────────────────────────────────────────────────

const STEP_LABELS = ["Device Info", "Condition", "Valuation"];

function CreateWizard({
  shopId,
  onDone,
  onCancel,
}: {
  shopId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<AutoGradeResult | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Party | null>(null);
  const [priceIntel, setPriceIntel] = useState<PriceIntel | null>(null);
  const [form, setForm] = useState<CreateTradeInDto>({
    shopId,
    customerName: "",
    customerPhone: "",
    deviceBrand: "",
    deviceModel: "",
    conditionGrade: "FAIR",
    conditionChecks: {},
    marketValue: 0,
    offeredValue: 0,
  });

  const setField = (key: keyof CreateTradeInDto, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Fetch price intelligence whenever brand+model change
  const fetchPriceIntel = (brand: string, model: string, storage?: string) => {
    if (!brand || !model || brand.length < 2 || model.length < 2) return;
    getPriceIntel(brand, model, storage).then(setPriceIntel).catch(() => setPriceIntel(null));
  };

  const toggleCheck = (key: string, val: boolean) =>
    setForm((f) => ({
      ...f,
      conditionChecks: { ...f.conditionChecks, [key]: val },
    }));

  const handleAutoGrade = async () => {
    if (!form.marketValue) return;
    setGrading(true);
    try {
      const result = await autoGradeDevice(form.conditionChecks ?? {}, form.marketValue);
      setGradeResult(result);
      setField("conditionGrade", result.grade === "JUNK" ? "POOR" : result.grade as TradeInGrade);
      setField("offeredValue", result.suggestedOffer);
    } finally {
      setGrading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await createTradeIn(form);
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border rounded-2xl p-6 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
        New Trade-in / Buyback
      </h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
        Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}
      </p>
      <StepIndicator current={step} total={STEP_LABELS.length} />

      {/* Step 1: Device Info */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Customer *
              </label>
              <PartySelector
                type="CUSTOMER"
                selectedParty={selectedCustomer}
                placeholder="Search customer by name or phone..."
                className="mt-1"
                onSelect={(party) => {
                  setSelectedCustomer(party);
                  setField("customerName", party.name);
                  setField("customerPhone", party.phone ?? "");
                  setField("customerId", party.id);
                }}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Device *
              </label>
              <DeviceModelSelector
                value={{ brand: form.deviceBrand, model: form.deviceModel }}
                onChange={(brand, model) => {
                  setField("deviceBrand", brand);
                  setField("deviceModel", model);
                  if (brand && model) {
                    fetchPriceIntel(brand, model, form.deviceStorage);
                  } else {
                    setPriceIntel(null);
                  }
                }}
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                IMEI (optional)
              </label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                value={form.deviceImei || ""}
                onChange={(e) => setField("deviceImei", e.target.value)}
                placeholder="15-digit IMEI"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Storage
              </label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                value={form.deviceStorage || ""}
                onChange={(e) => setField("deviceStorage", e.target.value)}
                onBlur={() => fetchPriceIntel(form.deviceBrand, form.deviceModel, form.deviceStorage)}
                placeholder="64GB, 128GB..."
              />
            </div>
          </div>

          {/* Price Intelligence Panel */}
          {priceIntel && priceIntel.count > 0 && (
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg p-3 mt-2">
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-1">
                <Sparkles size={12} /> Shop History: {priceIntel.count} past buyback{priceIntel.count > 1 ? "s" : ""} for this model
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Avg Offer</p>
                  <p className="text-sm font-bold text-teal-700 dark:text-teal-300">₹{priceIntel.avgOffer.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Range</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">₹{priceIntel.minOffer.toLocaleString("en-IN")}–{priceIntel.maxOffer.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Avg Market</p>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">₹{priceIntel.avgMarketValue.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <p className="text-xs text-teal-600 dark:text-teal-500 mt-2 text-center">Tap Next → Valuation to use these as reference</p>
            </div>
          )}
          <div className="flex justify-between pt-2">
            <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button
              onClick={() => setStep(1)}
              disabled={!selectedCustomer || !form.deviceBrand || !form.deviceModel}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-40"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Condition */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
              Overall Grade
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["EXCELLENT", "GOOD", "FAIR", "POOR"] as TradeInGrade[]).map(
                (g) => (
                  <button
                    key={g}
                    onClick={() => setField("conditionGrade", g)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.conditionGrade === g
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {GRADE_LABELS[g]}
                  </button>
                )
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
              Condition Checklist
            </label>
            <div className="space-y-2">
              {CONDITION_CHECKS.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={!!form.conditionChecks?.[c.key]}
                    onChange={(e) => toggleCheck(c.key, e.target.checked)}
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    {c.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {/* Auto-grade result */}
          {gradeResult && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    AI Grade: {gradeResult.gradeLabel}
                  </span>
                </div>
                <span className="text-sm font-bold text-blue-700">{gradeResult.score}/100</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-400">{gradeResult.recommendation}</p>
              {gradeResult.deductions.length > 0 && (
                <div className="text-xs text-red-600 space-y-0.5">
                  {gradeResult.deductions.map((d, i) => (
                    <div key={i}>⚠ {d.label} (-{d.deduction.toFixed(0)} pts)</div>
                  ))}
                </div>
              )}
              <p className="text-xs text-green-700 font-medium">
                Suggested offer: ₹{gradeResult.suggestedOffer.toLocaleString("en-IN")} ({Math.round(gradeResult.valuationMultiplier * 100)}% of market)
              </p>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(0)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Valuation */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Price Intel Banner */}
          <PriceIntelBanner
            priceIntel={priceIntel}
            brand={form.deviceBrand}
            model={form.deviceModel}
            storage={form.deviceStorage}
            onFetch={setPriceIntel}
            onUseMarketValue={(v) => setField("marketValue", v)}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Market Value (₹)
            </label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              value={form.marketValue || ""}
              placeholder="Enter current resale market value"
              onChange={(e) =>
                setField("marketValue", parseFloat(e.target.value) || 0)
              }
            />
            {form.marketValue > 0 && (
              <button
                type="button"
                onClick={handleAutoGrade}
                disabled={grading}
                className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium disabled:opacity-50"
              >
                <Sparkles size={14} />
                {grading ? "Analyzing..." : "Auto-Grade & Suggest Offer"}
              </button>
            )}
            {gradeResult && (
              <div className="mt-2 text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 space-y-1">
                <p className="font-semibold text-blue-700 dark:text-blue-400">{gradeResult.gradeLabel} · Score: {gradeResult.score}/100</p>
                <p className="text-gray-600 dark:text-slate-400">{gradeResult.recommendation}</p>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Offered Value (₹) *
            </label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              value={form.offeredValue}
              onChange={(e) =>
                setField("offeredValue", parseFloat(e.target.value) || 0)
              }
            />
            <p className="text-xs text-gray-400 mt-1">
              Amount you offer to the customer
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Notes (optional)
            </label>
            <textarea
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              rows={3}
              value={form.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Any additional notes..."
            />
          </div>
          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || form.offeredValue <= 0}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-40"
            >
              {submitting ? "Saving..." : "Create Trade-in"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function TradeInPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [tradeIns, setTradeIns] = useState<TradeIn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [actionResult, setActionResult] = useState<Record<string, { type: "inventory" | "voucher" | "payout"; label: string; voucherCode?: string }>>({});
  const [payoutPicker, setPayoutPicker] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listShops().then((s) => {
      setShops(s);
      if (s.length > 0) setSelectedShopId(s[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedShopId) load(page, search);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShopId, page, search]);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const res = await listTradeIns({ shopId: selectedShopId, page: p, limit: PAGE_SIZE, search: q || undefined });
      setTradeIns(res?.items ?? []);
      setTotal(res?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [selectedShopId]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(val.trim());
    }, 350);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const reload = () => load(page, search);

  const handleStatusChange = async (id: string, status: string) => {
    await updateTradeInStatus(id, status as any);
    reload();
  };

  const handleAddToInventory = async (t: TradeIn) => {
    setActionLoading((p) => ({ ...p, [t.id + "_inv"]: "loading" }));
    try {
      const res = await addTradeInToInventory(t.id);
      setActionResult((p) => ({
        ...p,
        [t.id + "_inv"]: {
          type: "inventory",
          label: res.alreadyAdded
            ? `In inventory: ${res.product?.name ?? "product"}`
            : `Added: ${res.product?.name ?? "product"} (${res.product?.quantity ?? 1} in stock)`,
        },
      }));
      reload();
    } catch (err: any) {
      alert(err?.message || "Failed to add to inventory");
    } finally {
      setActionLoading((p) => ({ ...p, [t.id + "_inv"]: "" }));
    }
  };

  const handleCompletePayout = async (t: TradeIn, mode: "CASH" | "UPI" | "BANK") => {
    setPayoutPicker(null);
    setActionLoading((p) => ({ ...p, [t.id + "_pay"]: "loading" }));
    try {
      const res = await completePayout(t.id, mode);
      setActionResult((p) => ({
        ...p,
        [t.id + "_pay"]: {
          type: "payout",
          label: res.alreadyPaid
            ? `Already paid via ${res.payoutMode}`
            : `Paid ₹${res.amount.toLocaleString("en-IN")} via ${mode}`,
        },
      }));
      reload();
    } catch (err: any) {
      alert(err?.message || "Failed to record payout");
    } finally {
      setActionLoading((p) => ({ ...p, [t.id + "_pay"]: "" }));
    }
  };

  const handleIssueCreditVoucher = async (t: TradeIn) => {
    setActionLoading((p) => ({ ...p, [t.id + "_vchr"]: "loading" }));
    try {
      const res = await issueCreditVoucher(t.id);
      setActionResult((p) => ({
        ...p,
        [t.id + "_vchr"]: {
          type: "voucher",
          label: res.alreadyIssued ? `Voucher already issued` : `Voucher issued`,
          voucherCode: res.voucher.voucherCode,
        },
      }));
      reload();
    } catch (err: any) {
      alert(err?.message || "Failed to issue voucher");
    } finally {
      setActionLoading((p) => ({ ...p, [t.id + "_vchr"]: "" }));
    }
  };

  if (showWizard) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <CreateWizard
          shopId={selectedShopId}
          onDone={() => {
            setShowWizard(false);
            load();
          }}
          onCancel={() => setShowWizard(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight size={24} /> Trade-in / Buyback
          </h1>
          <HelpGuide title="How Trade-In Works" subtitle="5-step guide" steps={TRADEIN_GUIDE} side="bottom" />
          {total > 0 && (
            <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
              {total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {shops.length > 1 && (
            <select
              className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={selectedShopId}
              onChange={(e) => { setSelectedShopId(e.target.value); setPage(1); }}
            >
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2.5 rounded-xl font-medium transition-colors"
          >
            <Plus size={15} /> New Trade-in
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by customer name, phone, device or TRD#…"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/60 transition"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <XCircle size={15} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-3" />
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-40 mb-2" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-32" />
            </div>
          ))}
        </div>
      ) : tradeIns.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <ArrowLeftRight size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">No trade-ins yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">Create your first buyback transaction</p>
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            <Plus size={15} /> New Trade-in
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tradeIns.map((t) => {
            const isActionable = t.status === "ACCEPTED" || t.status === "COMPLETED";
            const gradePalette: Record<TradeInGrade, string> = {
              EXCELLENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
              GOOD:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
              FAIR:      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
              POOR:      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            };
            const statusPalette: Record<string, string> = {
              DRAFT:     "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
              OFFERED:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
              ACCEPTED:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
              REJECTED:  "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
              COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
            };
            return (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider">{t.tradeInNumber}</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusPalette[t.status]}`}>
                      {t.status.charAt(0) + t.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <select
                    className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer hover:border-blue-400 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value)}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="OFFERED">Offered</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                {/* Device + Customer */}
                <div className="px-5 py-3 flex gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {t.deviceBrand} {t.deviceModel}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {[t.deviceStorage, t.deviceImei ? `IMEI: ${t.deviceImei}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className={`self-start shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg ${gradePalette[t.conditionGrade]}`}>
                    {GRADE_LABELS[t.conditionGrade]}
                  </span>
                </div>

                {/* Valuation row */}
                <div className="px-5 pb-3 flex items-center gap-6">
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">Market</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">₹{t.marketValue.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">Offered</p>
                    <p className="text-base font-bold text-blue-600 dark:text-blue-400">₹{t.offeredValue.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{t.customerName}</p>
                    <p className="text-xs text-slate-400">{t.customerPhone}</p>
                  </div>
                </div>

                {/* Post-Completion Actions */}
                {isActionable && (
                  <div className="px-5 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                    {/* Add to Inventory */}
                    {actionResult[t.id + "_inv"] ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 size={11} /> {actionResult[t.id + "_inv"].label}
                      </span>
                    ) : t.inventoryProductId ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg font-medium">
                        <CheckCircle2 size={11} /> In Inventory
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!!actionLoading[t.id + "_inv"]}
                        onClick={() => handleAddToInventory(t)}
                        className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        📦 {actionLoading[t.id + "_inv"] ? "Adding…" : "Add to Inventory"}
                      </button>
                    )}

                    {/* Issue Credit Voucher */}
                    {actionResult[t.id + "_vchr"] ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg font-mono">
                        🎟 {actionResult[t.id + "_vchr"].voucherCode}
                      </span>
                    ) : t.creditVoucherId ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg font-medium">
                        🎟 {t.creditVoucher?.voucherCode
                          ? <span className="font-mono font-bold">{t.creditVoucher.voucherCode}</span>
                          : "Voucher Issued"}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!!actionLoading[t.id + "_vchr"]}
                        onClick={() => handleIssueCreditVoucher(t)}
                        className="inline-flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        🎟 {actionLoading[t.id + "_vchr"] ? "Issuing…" : "Issue Voucher"}
                      </button>
                    )}

                    {/* Pay Customer */}
                    {actionResult[t.id + "_pay"] ? (
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 size={11} /> {actionResult[t.id + "_pay"].label}
                      </span>
                    ) : t.payoutMode ? (
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg font-medium">
                        <CheckCircle2 size={11} /> Paid via {t.payoutMode}
                      </span>
                    ) : payoutPicker === t.id ? (
                      <div className="inline-flex items-center gap-1">
                        {(["CASH", "UPI", "BANK"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            disabled={!!actionLoading[t.id + "_pay"]}
                            onClick={() => handleCompletePayout(t, m)}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
                          >
                            {m}
                          </button>
                        ))}
                        <button type="button" onClick={() => setPayoutPicker(null)} className="text-xs text-slate-400 hover:text-slate-600 px-1.5">✕</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!!actionLoading[t.id + "_pay"]}
                        onClick={() => setPayoutPicker(t.id)}
                        className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        💵 {actionLoading[t.id + "_pay"] ? "Paying…" : "Pay Customer"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1
                : page <= 4 ? i + 1
                : page >= totalPages - 3 ? totalPages - 6 + i
                : page - 3 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
