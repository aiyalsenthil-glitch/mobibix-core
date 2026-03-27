"use client";

import { type Party } from "@/services/parties.api";
import { type Shop } from "@/services/shops.api";
import { PartySelector } from "@/components/common/PartySelector";
import { LoyaltyRedemptionInput } from "@/components/loyalty/LoyaltyRedemptionInput";
import { Store, User, CalendarDays, BadgeCheck, MapPin, AlertTriangle } from "lucide-react";

interface InvoiceSidebarProps {
  shop: Shop;
  selectedCustomer: Party | null;
  onSelectCustomer: (c: Party) => void;
  onClearCustomer: () => void;
  onNewCustomer: () => void;
  invoiceDate: string;
  onDateChange: (d: string) => void;
  isInterState: boolean;
  // Loyalty
  loyaltyBalance: number;
  loyaltyDiscount: number;
  customerId?: string;
  invoiceSubTotal: number; // in paisa
  onLoyaltyPointsChange: (pts: number) => void;
  onLoyaltyDiscountChange: (discountPaise: number) => void;
}

export function InvoiceSidebar({
  shop,
  selectedCustomer,
  onSelectCustomer,
  onClearCustomer,
  onNewCustomer,
  invoiceDate,
  onDateChange,
  isInterState,
  loyaltyBalance,
  loyaltyDiscount,
  customerId,
  invoiceSubTotal,
  onLoyaltyPointsChange,
  onLoyaltyDiscountChange,
}: InvoiceSidebarProps) {
  return (
    <aside className="flex flex-col gap-4">
      {/* Shop Badge */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-teal-500/10">
            <Store className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 leading-none mb-1">
              Shop
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {shop.name}
            </p>
          </div>
          <span className="ml-auto flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
        </div>
        {shop.city && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="w-3 h-3" />
            <span>{shop.city}{shop.state ? `, ${shop.state}` : ""}</span>
          </div>
        )}
      </div>

      {/* Customer Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            Customer
          </p>
        </div>

        {selectedCustomer ? (
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-black/20 p-3 group">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                  {selectedCustomer.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedCustomer.phone}
                </p>
                {selectedCustomer.gstNumber && (
                  <div className="mt-2 flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      {selectedCustomer.gstNumber}
                    </span>
                  </div>
                )}
                {isInterState && shop.gstEnabled && (
                  <div className="mt-2 flex items-center gap-1 rounded-lg bg-sky-100 dark:bg-sky-500/10 px-2 py-1">
                    <AlertTriangle className="w-3 h-3 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                    <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300">
                      IGST applies (Inter-State)
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClearCustomer}
                className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition text-lg leading-none ml-2 flex-shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <PartySelector
              type="CUSTOMER"
              onSelect={onSelectCustomer}
              placeholder="Search by name or phone..."
              className="w-full"
            />
            <button
              onClick={onNewCustomer}
              className="w-full py-2 text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 border border-teal-400/30 rounded-xl hover:bg-teal-500/5 transition"
            >
              + New Customer
            </button>
          </div>
        )}
      </div>

      {/* Invoice Date */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-amber-500/10">
            <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            Invoice Date
          </p>
        </div>
        <input
          type="date"
          value={invoiceDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400/70 transition"
        />
      </div>

      {/* Loyalty Rewards */}
      {customerId && loyaltyBalance > 0 && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 dark:bg-amber-500/10 backdrop-blur-xl p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400 mb-3">
            ♦ Loyalty Rewards
          </p>
          <LoyaltyRedemptionInput
            customerId={customerId}
            balance={loyaltyBalance}
            invoiceSubTotal={invoiceSubTotal}
            onRedemptionChange={onLoyaltyPointsChange}
            onDiscountChange={onLoyaltyDiscountChange}
          />
          {loyaltyDiscount > 0 && (
            <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              ✓ ₹{loyaltyDiscount.toFixed(2)} discount applied
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
