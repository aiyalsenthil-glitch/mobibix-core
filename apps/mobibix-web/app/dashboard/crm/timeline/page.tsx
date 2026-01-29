"use client";

import { useState } from "react";
import { CustomerTimeline } from "@/components/crm";

export default function TimelinePage() {
  const [customerId, setCustomerId] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Customer Timeline</h1>
        <p className="text-gray-500 mt-1">
          View activity history for any customer
        </p>
      </div>

      {/* Search for Customer */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
        <label className="block text-sm font-medium mb-2">
          Select Customer (by ID)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="Enter customer ID..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-teal-400"
          />
          <button
            onClick={() => setCustomerId("")}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: You can also access timeline from customer details page
        </p>
      </div>

      {/* Timeline */}
      {customerId ? (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Timeline</h2>
          <CustomerTimeline customerId={customerId} showFilter={true} />
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-8 text-center">
          <p className="text-blue-700 dark:text-blue-300 font-medium">
            👆 Enter a customer ID above to view their timeline
          </p>
        </div>
      )}
    </div>
  );
}
