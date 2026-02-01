"use client";

import { useEffect, useState } from "react";
import {
  createJobCard,
  updateJobCard,
  type CreateJobCardDto,
  type JobCard,
  type UpdateJobCardDto,
} from "@/services/jobcard.api";
import {
  getCustomer,
  // searchCustomers,
  // type Customer,
} from "@/services/customers.api";
import { CustomerModal } from "../customers/CustomerModal";
import { PartySelector } from "@/components/common/PartySelector";
import { type Party } from "@/services/parties.api";

interface JobCardModalProps {
  shopId: string;
  jobCard: JobCard | null;
  onClose: () => void;
}

type StepFormData = {
  // customerName/Phone preserved for fallbacks if needed but relying on selectedParty
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  deviceSerial: string;
  devicePassword: string;
  customerComplaint: string;
  physicalCondition: string;
  estimatedCost: string;
  diagnosticCharge: string;
  advancePaid: string;
  billType: string;
  estimatedDelivery: string;
};

export function JobCardModal({ shopId, jobCard, onClose }: JobCardModalProps) {
  const isEdit = !!jobCard;
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const [formData, setFormData] = useState<StepFormData>({
    deviceType: jobCard?.deviceType || "",
    deviceBrand: jobCard?.deviceBrand || "",
    deviceModel: jobCard?.deviceModel || "",
    deviceSerial: jobCard?.deviceSerial || "",
    devicePassword: jobCard?.devicePassword || "",
    customerComplaint: jobCard?.customerComplaint || "",
    physicalCondition: jobCard?.physicalCondition || "",
    estimatedCost: jobCard?.estimatedCost?.toString() || "",
    diagnosticCharge: jobCard?.diagnosticCharge?.toString() || "",
    advancePaid: jobCard?.advancePaid?.toString() || "",
    billType: jobCard?.billType || "WITHOUT_GST",
    estimatedDelivery: jobCard?.estimatedDelivery
      ? new Date(jobCard.estimatedDelivery).toISOString().split("T")[0]
      : "",
  });

  useEffect(() => {
    const loadCustomer = async () => {
      if (jobCard?.customerId) {
        try {
          const c = await getCustomer(jobCard.customerId);
          // Map Customer to Party structure for compatibility in state if feasible
          // Since getCustomer returns a legacy Customer, and we want Party...
          // effectively they share common fields id, name, phone.
          if (c) {
             const party: Party = {
                id: c.id,
                name: c.name,
                phone: c.phone,
                partyType: 'CUSTOMER', // Inferred as it was a job card
                tenantId: '', // Not needed for UI display usually
                // other optional fields
             } as any; // Type casting for compatibility if strict types mismatch
             setSelectedParty(party);
          }
        } catch {
          //
        }
      }
    };
    loadCustomer();
  }, [jobCard?.customerId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // If edit, we might keep existing customerId if not changed, 
    // but if changed, we need selectedParty.
    // If Creating, we need selectedParty.
    
    // For edit mode, if selectedParty is null but we had an original jobCard.customerId?
    // The useEffect above sets selectedParty. So we should rely on selectedParty.
    
    if (!selectedParty) {
      setError("Please select a customer");
      setIsSubmitting(false);
      return;
    }

    const basePayload = {
      deviceType: formData.deviceType,
      deviceBrand: formData.deviceBrand,
      deviceModel: formData.deviceModel,
      deviceSerial: formData.deviceSerial || undefined,
      devicePassword: formData.devicePassword || undefined,
      customerComplaint: formData.customerComplaint,
      physicalCondition: formData.physicalCondition || undefined,
      estimatedCost: formData.estimatedCost
        ? parseFloat(formData.estimatedCost)
        : undefined,
      diagnosticCharge: formData.diagnosticCharge
        ? parseFloat(formData.diagnosticCharge)
        : undefined,
      advancePaid: formData.advancePaid
        ? parseFloat(formData.advancePaid)
        : undefined,
      billType: formData.billType,
      estimatedDelivery: formData.estimatedDelivery || undefined,
    };

    const payload: CreateJobCardDto | UpdateJobCardDto = {
        customerId: selectedParty.id,
        customerName: selectedParty.name,
        customerPhone: selectedParty.phone,
        ...basePayload,
    };

    try {
      if (isEdit) {
        await updateJobCard(shopId, jobCard!.id, payload as UpdateJobCardDto);
      } else {
        await createJobCard(shopId, payload as CreateJobCardDto);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save job card");
    } finally {
      setIsSubmitting(false);
    }
  };

  const STEPS = [
    { num: 1, label: "Customer" },
    { num: 2, label: "Device" },
    { num: 3, label: "Issue" },
    { num: 4, label: "Financials" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isEdit ? "Edit Job Card" : "New Job Card"}
            </h2>
            <p className="text-teal-100 text-sm mt-1">
              Step {currentStep} of 4
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-teal-100 hover:text-white hover:bg-white/20 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-2 px-8 pt-6 pb-4">
          {STEPS.map((step) => (
            <div key={step.num} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition ${
                  currentStep >= step.num
                    ? "bg-teal-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {currentStep > step.num ? "✓" : step.num}
              </div>
              <div
                className={`flex-1 h-1 mx-2 rounded transition ${
                  currentStep > step.num ? "bg-teal-600" : "bg-gray-200"
                }`}
              />
            </div>
          ))}
          <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-gray-600">
            {STEPS[STEPS.length - 1].num}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in">
                <div className="flex-shrink-0 text-red-600 text-xl">⚠️</div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Step 1: Customer */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Customer Information
                  </h3>

                  {/* Customer Selection */}
                  <div className="space-y-4">
                      {selectedParty ? (
                        <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-lg text-gray-900">
                                {selectedParty.name}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {selectedParty.phone}
                              </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedParty(null)}
                                className="text-teal-600 hover:text-teal-700 font-semibold text-sm px-3 py-1 hover:bg-teal-100 rounded transition"
                              >
                                Change
                              </button>
                          </div>
                        </div>
                      ) : (
                         <PartySelector
                            type="CUSTOMER"
                            onSelect={setSelectedParty}
                            placeholder="Type name or phone (2+ chars)..."
                            onCreateNew={() => setShowAddCustomer(true)}
                          />
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Device */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">
                  Device Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Device Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="deviceType"
                      value={formData.deviceType}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                      placeholder="e.g., Mobile Phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Brand <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="deviceBrand"
                      value={formData.deviceBrand}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                      placeholder="e.g., Apple"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="deviceModel"
                    value={formData.deviceModel}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    placeholder="e.g., iPhone 14 Pro"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      IMEI / Serial
                    </label>
                    <input
                      type="text"
                      name="deviceSerial"
                      value={formData.deviceSerial}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                      placeholder="Enter device identifier"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Device Password
                    </label>
                    <input
                      type="text"
                      name="devicePassword"
                      value={formData.devicePassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                      placeholder="If provided"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Issue */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">
                  Issue Details
                </h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Customer Complaint <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="customerComplaint"
                    value={formData.customerComplaint}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
                    placeholder="Describe the issue in detail..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Physical Condition
                  </label>
                  <textarea
                    name="physicalCondition"
                    value={formData.physicalCondition}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
                    placeholder="Note any scratches, dents, water damage, etc."
                  />
                </div>
              </div>
            )}

            {/* Step 4: Financials */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">
                  Pricing & Delivery
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Estimated Budget
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-gray-600 font-semibold">
                        ₹
                      </span>
                      <input
                        type="number"
                        name="estimatedCost"
                        value={formData.estimatedCost}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Diagnostic Charge
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-gray-600 font-semibold">
                        ₹
                      </span>
                      <input
                        type="number"
                        name="diagnosticCharge"
                        value={formData.diagnosticCharge}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Advance Received
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-gray-600 font-semibold">
                        ₹
                      </span>
                      <input
                        type="number"
                        name="advancePaid"
                        value={formData.advancePaid}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bill Type
                    </label>
                    <select
                      name="billType"
                      value={formData.billType}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition bg-white"
                    >
                      <option value="WITHOUT_GST">Without GST</option>
                      <option value="WITH_GST">With GST (18%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Est. Delivery Date
                    </label>
                    <input
                      type="date"
                      name="estimatedDelivery"
                      value={formData.estimatedDelivery}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep(currentStep - 1);
              } else {
                onClose();
              }
            }}
            className="px-6 py-2.5 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition"
          >
            {currentStep === 1 ? "Cancel" : "← Back"}
          </button>

          <button
            onClick={() => {
              if (currentStep < 4) {
                setCurrentStep(currentStep + 1);
              } else {
                document
                  .querySelector("form")
                  ?.dispatchEvent(
                    new Event("submit", { bubbles: true, cancelable: true }),
                  );
              }
            }}
            onSubmit={handleSubmit}
            form="jobcard-form"
            disabled={isSubmitting}
            className="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg font-bold transition"
          >
            {isSubmitting
              ? "Saving..."
              : currentStep === 4
                ? isEdit
                  ? "Update Job Card"
                  : "Create Job Card"
                : "Next →"}
          </button>
        </div>
      </div>

      {showAddCustomer && (
        <CustomerModal
          onClose={() => {
            setShowAddCustomer(false);
          }}
        />
      )}
    </div>
  );
}
