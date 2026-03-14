"use client";

import Link from "next/link";
import {
  ClipboardCheck, ArrowLeft, CheckCircle2, AlertTriangle,
  PackageSearch, BarChart2, ShieldCheck, ChevronRight,
  Layers, Clock, Users, TrendingDown,
} from "lucide-react";

const STEPS = [
  {
    step: "1",
    icon: ClipboardCheck,
    title: "Start a Verification Session",
    color: "blue",
    desc: "Go to Stock Verification and click Start Verification. Choose today's date (or a past date if you're catching up). Only one session can be active per shop at a time — if one is open, you must confirm or cancel it first.",
    tips: ["Sessions are per-shop. If you manage multiple shops, start a separate session for each.", "Add a note like 'Weekly iPhone parts count' to make past sessions easy to identify."],
  },
  {
    step: "2",
    icon: PackageSearch,
    title: "Count Products Physically",
    color: "indigo",
    desc: "Go to your shelves or storage area and physically count each product. Type the number you actually see into the Physical column. The System column shows what your software thinks you have. Leave the Physical column blank for products you haven't counted yet — you can come back and fill them in.",
    tips: ["Use the search bar to jump to a specific product by name or category.", "Count one category per day (e.g. Monday: iPhone parts, Tuesday: Samsung parts) — you don't have to count everything in one session.", "Click Save Draft at any time to save your progress and resume later."],
  },
  {
    step: "3",
    icon: AlertTriangle,
    title: "Select a Reason for Every Difference",
    color: "orange",
    desc: "When your physical count is different from the system number, the Reason dropdown unlocks automatically. You must select a reason before confirming. This is the most important step — honest reason selection makes your Shrinkage Intelligence reports accurate and useful.",
    tips: null,
    reasons: [
      { label: "Breakage", color: "bg-red-500", desc: "Item physically broke — cracked screen, bent charging port." },
      { label: "Damage", color: "bg-orange-500", desc: "Damaged in a demo, display unit, or during transit. Still exists, just unusable." },
      { label: "Lost / Missing", color: "bg-purple-500", desc: "Cannot be found. Possible theft or misplacement. Use this only when you genuinely cannot account for it." },
      { label: "Internal Use", color: "bg-blue-500", desc: "Used inside the shop — demo device, gifted to a loyal customer, staff personal use." },
      { label: "Spare Part Damage", color: "bg-yellow-500", desc: "Part broke during a repair job. The battery swelled, the flex tore during disassembly." },
      { label: "Data Correction", color: "bg-gray-400", desc: "You're fixing a past mistake — wrong quantity entered on a GRN, billing error, etc." },
    ],
  },
  {
    step: "4",
    icon: ShieldCheck,
    title: "Confirm & Apply",
    color: "green",
    desc: "When you're done counting, click Confirm & Apply. The system will: adjust your stock quantities to match physical counts, write a permanent entry in the Stock Ledger for every difference, and feed the data into Shrinkage Intelligence automatically. This action cannot be undone — double-check your counts before confirming.",
    tips: ["Only managers and owners can confirm sessions.", "The session summary (Items Checked · Mismatches · Loss Value) shows above the session before you confirm so you can review.", "After confirmation, the session moves to CONFIRMED and is visible in Past Sessions."],
  },
  {
    step: "5",
    icon: BarChart2,
    title: "Review Shrinkage Intelligence",
    color: "purple",
    desc: "After confirming, go to Tools → Shrinkage Intelligence. Your loss data appears immediately — broken down by reason, category, product, staff, and month. Use this to find patterns: Is the same product always breaking? Is loss concentrated on certain days? Is one staff member's sessions showing more losses?",
    tips: ["Set the date range to Last 90 Days to see enough data for patterns.", "The Monthly Trend chart shows if your shrinkage is getting better or worse over time.", "The Top 10 Products list shows where to focus tighter physical security."],
  },
];

const FAQ = [
  {
    q: "Can I edit a session after saving as draft?",
    a: "Yes. Sessions in DRAFT status can be edited at any time. The physical count and reason for any product can be updated by entering new values and clicking Save Draft again. The last entry always wins.",
  },
  {
    q: "What happens if I cancel a session?",
    a: "Nothing changes in your stock. A cancelled session is preserved in your history for audit purposes but no quantities are adjusted and no ledger entries are created.",
  },
  {
    q: "Can two staff members work on the same session simultaneously?",
    a: "There is only one active session per shop. Two staff members can both enter counts into it (last write wins per product), but they should coordinate to avoid overwriting each other's counts.",
  },
  {
    q: "What if I don't know the reason for a difference?",
    a: "Use 'Data Correction' as a fallback when you genuinely cannot determine the cause. Avoid overusing it — if 'Data Correction' is your most common reason, it usually means your incoming stock counting process (GRNs) needs tightening.",
  },
  {
    q: "Does confirming affect my financial reports?",
    a: "Stock adjustments write to the Stock Ledger with the product's Weighted Average Cost (WAC), which feeds the Shrinkage Intelligence loss value reports. It does not create sales invoices or affect your P&L directly — shrinkage is tracked separately as inventory loss.",
  },
  {
    q: "How often should I run verification sessions?",
    a: "Weekly micro-counts (one category per day, 10–15 minutes) work better than one annual full count. This catches problems early, when you can still investigate the cause.",
  },
];

const colorMap: Record<string, { bg: string; text: string; ring: string; badge: string }> = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-900/20",   text: "text-blue-700 dark:text-blue-400",   ring: "bg-blue-600",   badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-700 dark:text-indigo-400", ring: "bg-indigo-600", badge: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" },
  orange: { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-700 dark:text-orange-400", ring: "bg-orange-500", badge: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" },
  green:  { bg: "bg-green-50 dark:bg-green-900/20",  text: "text-green-700 dark:text-green-400",  ring: "bg-green-600",  badge: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  purple: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-400", ring: "bg-purple-600", badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
};

export default function StockVerificationGuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

      {/* Header */}
      <div>
        <Link
          href="/tools/stock-verification"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-5"
        >
          <ArrowLeft size={14} /> Back to Stock Verification
        </Link>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex-shrink-0">
            <ClipboardCheck size={28} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Verification Guide</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm leading-relaxed">
              Learn how to count your physical inventory, record losses with reasons, and let MobiBix automatically update your stock and shrinkage reports.
            </p>
          </div>
        </div>
      </div>

      {/* Why it matters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: TrendingDown, label: "Stop silent losses", sub: "Know exactly what disappeared and why" },
          { icon: Layers,       label: "Accurate stock",     sub: "System matches what's on the shelf" },
          { icon: Clock,        label: "10 min per session", sub: "Count one category at a time" },
          { icon: Users,        label: "Staff accountability", sub: "Know which sessions show losses" },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3 text-center shadow-sm">
            <Icon size={20} className="text-blue-500 dark:text-blue-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">{label}</p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 leading-tight">{sub}</p>
          </div>
        ))}
      </div>

      {/* Step-by-step */}
      <div className="space-y-5">
        <h2 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Step-by-Step Workflow</h2>

        {STEPS.map((s) => {
          const c = colorMap[s.color];
          const Icon = s.icon;
          return (
            <div key={s.step} className={`rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden`}>
              <div className={`${c.bg} px-5 py-4 flex items-center gap-3 border-b border-gray-200 dark:border-slate-800`}>
                <span className={`w-7 h-7 rounded-full ${c.ring} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>{s.step}</span>
                <Icon size={16} className={c.text} />
                <h3 className={`text-sm font-bold ${c.text}`}>{s.title}</h3>
              </div>
              <div className="bg-white dark:bg-slate-900 px-5 py-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{s.desc}</p>

                {s.reasons && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {s.reasons.map((r) => (
                      <div key={r.label} className="flex items-start gap-2.5 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800">
                        <span className={`w-2.5 h-2.5 rounded-full ${r.color} flex-shrink-0 mt-1`} />
                        <div>
                          <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">{r.label}</p>
                          <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-snug mt-0.5">{r.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {s.tips && (
                  <ul className="space-y-1.5">
                    {s.tips.map((tip) => (
                      <li key={tip} className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
                        <CheckCircle2 size={13} className="text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommended schedule */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300">Recommended Weekly Schedule</h3>
        <div className="space-y-2">
          {[
            { day: "Monday",    task: "Count all iPhone spare parts" },
            { day: "Tuesday",   task: "Count all Samsung spare parts" },
            { day: "Wednesday", task: "Count batteries & charging accessories" },
            { day: "Thursday",  task: "Count tempered glass & covers" },
            { day: "Friday",    task: "Count cables, earphones & small accessories" },
          ].map(({ day, task }) => (
            <div key={day} className="flex items-center gap-3 text-sm">
              <span className="w-24 text-xs font-bold text-blue-700 dark:text-blue-400 flex-shrink-0">{day}</span>
              <ChevronRight size={12} className="text-blue-400 flex-shrink-0" />
              <span className="text-blue-800 dark:text-blue-300 font-medium">{task}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400 italic mt-2">10–15 minutes per day. By Friday you have a full-week count without disrupting operations.</p>
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-200">{q}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <ClipboardCheck size={32} className="text-white/80 mx-auto" />
        <h3 className="text-lg font-bold text-white">Ready to start your first count?</h3>
        <p className="text-blue-100 text-sm max-w-sm mx-auto">Start a verification session now. The first count shows you exactly where your stock stands — and every session after that shows you if things are getting better or worse.</p>
        <Link
          href="/tools/stock-verification"
          className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-50 transition-all shadow-lg active:scale-95"
        >
          <ClipboardCheck size={16} /> Start Stock Verification
        </Link>
      </div>

    </div>
  );
}
