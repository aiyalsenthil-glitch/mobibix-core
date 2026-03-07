"use client";

import { useState, useEffect } from "react";
import { CustomerTimeline } from "@/components/crm";
import { searchCustomers, type Customer } from "@/services/customers.api";

export default function TimelinePage() {
  const [selected, setSelected] = useState<{
    id: string;
    name: string;
    phone?: string;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchCustomers(query, 5);
        setResults(data);
        setShowDropdown(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function selectCustomer(c: Customer) {
    setSelected({ id: c.id, name: c.name, phone: c.phone ?? undefined });
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Customer Timeline</h1>
        <p className="text-gray-500 mt-1">
          View activity history for any customer
        </p>
      </div>

      {/* Customer Search */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
        <label className="block text-sm font-medium mb-2">
          Search Customer
        </label>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selected) setSelected(null);
            }}
            placeholder="Type name or phone number..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-teal-400"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              Searching...
            </span>
          )}
          {showDropdown && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCustomer(c)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {c.name}
                  </p>
                  {c.phone && (
                    <p className="text-xs text-gray-500">{c.phone}</p>
                  )}
                </button>
              ))}
            </div>
          )}
          {query.trim().length >= 2 &&
            !searching &&
            results.length === 0 &&
            !selected && (
              <p className="text-xs text-gray-500 mt-2">No customers found</p>
            )}
        </div>
        {selected && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              Viewing: {selected.name}
            </span>
            {selected.phone && (
              <span className="text-xs text-gray-500">{selected.phone}</span>
            )}
            <button
              onClick={() => setSelected(null)}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              Clear
            </button>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: You can also access timeline from the customer details page
        </p>
      </div>

      {/* Timeline */}
      {selected ? (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            Timeline — {selected.name}
          </h2>
          <CustomerTimeline customerId={selected.id} showFilter={true} />
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-8 text-center">
          <p className="text-blue-700 dark:text-blue-300 font-medium">
            👆 Search and select a customer above to view their timeline
          </p>
        </div>
      )}
    </div>
  );
}
