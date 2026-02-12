"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Phone, MapPin, User, Building2 } from "lucide-react";
import { cn } from "@/lib/lib/utils";
import { searchParties, type Party, type PartyType, upgradeParty } from "@/services/parties.api";

interface PartySelectorProps {
  type: PartyType;
  onSelect: (party: Party) => void;
  selectedParty?: Party | null;
  placeholder?: string;
  className?: string;
  onCreateNew?: () => void;
}

export function PartySelector({
  type,
  onSelect,
  selectedParty,
  placeholder = "Select party...",
  className,
  onCreateNew,
}: PartySelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Upgrade Confirmation State
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [pendingParty, setPendingParty] = useState<Party | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside the modal (which is portaled/fixed z-index, but check containment)
      // Actually modal is fixed overlay, so click outside logic for dropdown shouldn't interfere if modal blocks pointer events.
      // But we should check.
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // FIXED: Search globally without filtering by type
      const data = await searchParties(value);
      setResults(data);
    } catch (error) {
      console.error("Failed to search parties:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (party: Party) => {
    // Logic to check role compatibility
    const needsUpgrade =
      (type === "CUSTOMER" && party.partyType === "VENDOR") ||
      (type === "VENDOR" && party.partyType === "CUSTOMER");
    
    // NOTE: 'BOTH' parties are always compatible.

    if (needsUpgrade) {
      setPendingParty(party);
      setShowUpgradeConfirm(true);
      setOpen(false); // Close dropdown
      return;
    }

    onSelect(party);
    setQuery("");
    setOpen(false);
  };

  const confirmUpgrade = async () => {
    if (!pendingParty) return;
    setIsUpgrading(true);
    try {
      const roleToUpgradeTo = type === "CUSTOMER" ? "CUSTOMER" : "VENDOR";
      const updated = await upgradeParty(pendingParty.id, roleToUpgradeTo);
      onSelect(updated);
      setQuery("");
    } catch (err) {
      console.error("Upgrade failed", err);
      // Fallback: alert user
      alert("Failed to upgrade party role. Please try again.");
    } finally {
      setIsUpgrading(false);
      setShowUpgradeConfirm(false);
      setPendingParty(null);
    }
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <div
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-slate-200 dark:border-white/10 rounded-md cursor-text hover:border-slate-400 dark:hover:border-white/20 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-colors"
        onClick={() => setOpen(true)}
      >
        {selectedParty && !open ? (
          <div className="flex flex-col items-start overflow-hidden">
            <span className="font-medium truncate">{selectedParty.name}</span>
            <span className="text-xs text-muted-foreground">
              {selectedParty.phone}
            </span>
          </div>
        ) : (
          <input
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => {
              setOpen(true);
              // Trigger search if query exists to show results again
              if (query.length >= 2 && results.length === 0) {
                 handleSearch(query);
              }
            }}
          />
        )}
        <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
      </div>

      {open && (query.length > 0 || results.length > 0) && (
        <div className="absolute z-50 w-full mt-1 overflow-hidden bg-white dark:bg-stone-900 border border-slate-200 dark:border-white/10 rounded-md shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="max-h-[300px] overflow-y-auto p-1">
            {loading ? (
              <div className="px-2 py-4 text-sm text-center text-slate-500 dark:text-slate-400">
                Loading...
              </div>
            ) : results.length === 0 ? (
              <div className="px-2 py-4 text-sm text-center text-slate-500 dark:text-slate-400">
                No results found.
                {onCreateNew && (
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onCreateNew();
                      setOpen(false);
                    }}
                    className="mt-2 text-teal-600 hover:text-teal-700 hover:underline font-medium block w-full transition-colors"
                  >
                    + Create New
                  </button>
                )}
              </div>
            ) : (
              results.map((party) => (
                <div
                  key={party.id}
                  className={cn(
                    "relative flex items-center w-full px-2 py-2 text-sm rounded-sm cursor-pointer select-none hover:bg-teal-50 dark:hover:bg-white/5 transition-colors",
                    selectedParty?.id === party.id &&
                      "bg-teal-50 dark:bg-white/5",
                  )}
                  onClick={() => handleSelect(party)}
                >
                  <div className="flex flex-col flex-1 gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">{party.name}</span>
                        {/* Role Badge */}
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase",
                            party.partyType === 'BOTH' ? "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30" :
                            party.partyType === 'CUSTOMER' ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30" :
                            "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30"
                        )}>
                            {party.partyType}
                        </span>
                    </div>
                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-2">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {party.phone}
                      </span>
                      {party.state && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {party.state}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedParty?.id === party.id && (
                    <Check className="w-4 h-4 text-teal-600" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Upgrade Confirmation Modal */}
      {showUpgradeConfirm && pendingParty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border border-slate-200 dark:border-white/10 transform transition-all scale-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/30 rounded-full flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {type === "CUSTOMER"
                  ? "Enable Customer Access?"
                  : "Enable Supplier Access?"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                <strong>{pendingParty.name}</strong> is currently registered as a{" "}
                {pendingParty.partyType.toLowerCase()}. Do you want to enable{" "}
                {type === "CUSTOMER" ? "customer" : "supplier"} features for
                them?
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    setShowUpgradeConfirm(false);
                    setPendingParty(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition"
                  disabled={isUpgrading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpgrade}
                  disabled={isUpgrading}
                  className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  {isUpgrading ? "Updating..." : "Yes, Enable"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
