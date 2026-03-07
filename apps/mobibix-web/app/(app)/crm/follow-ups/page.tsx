"use client";

import { useState } from "react";
import { MyFollowUpsWidget, AddFollowUpModal } from "@/components/crm";
import { CustomerTabs } from "@/components/crm/CustomerTabs";

export default function FollowUpsPage() {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-6">
      <CustomerTabs />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Follow-ups</h1>
          <p className="text-gray-500 mt-1">
            Manage your customer follow-up tasks
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
        >
          + Add Follow-up
        </button>
      </div>

      {/* Follow-ups Widget */}
      <MyFollowUpsWidget />

      {/* Add Follow-up Modal — customer search built into modal */}
      <AddFollowUpModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => setShowAddModal(false)}
      />
    </div>
  );
}
