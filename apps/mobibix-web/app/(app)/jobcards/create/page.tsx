"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createJobCard, type CreateJobCardDto } from "@/services/jobcard.api";
import { useShop } from "@/context/ShopContext";
import { PartySelector } from "@/components/common/PartySelector";
import { type Party } from "@/services/parties.api";
import { CustomerModal } from "../../customers/CustomerModal";

type StepFormData = {
  // Customer info is now handled via Party selection mostly, but we keep fields for display/fallback if needed 
  // though we enforce selecting a request.
  // Actually, we store party details.
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

export default function CreateJobCardPage() {
  const router = useRouter();
  const { selectedShopId, selectedShop: shop } = useShop();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const [formData, setFormData] = useState<StepFormData>({
    deviceType: "Mobile",
    deviceBrand: "",
    deviceModel: "",
    deviceSerial: "",
    devicePassword: "",
    customerComplaint: "",
    physicalCondition: "",
    estimatedCost: "",
    diagnosticCharge: "",
    advancePaid: "",
    billType: "WITHOUT_GST",
    estimatedDelivery: "",
  });

  // AUTOMATION: Automatically set billType based on shop's GST configuration
  useEffect(() => {
    if (shop) {
      const targetType = shop.gstEnabled ? "WITH_GST" : "WITHOUT_GST";
      if (formData.billType !== targetType) {
        setFormData((prev) => ({ ...prev, billType: targetType }));
      }
    }
  }, [shop?.gstEnabled]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedShopId) {
      setError("Shop not selected");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    if (!selectedParty) {
      setError("Please select a customer");
      setIsSubmitting(false);
      return;
    }

    const payload: CreateJobCardDto = {
      customerId: selectedParty.id,
      customerName: selectedParty.name,
      customerPhone: selectedParty.phone,
      // customerAltPhone: ... (Party model has altPhone, strictly speaking we should use it if available)
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

    try {
      await createJobCard(selectedShopId, payload);
      router.push("/jobcards");
    } catch (err: any) {
      setError(err.message || "Failed to save job card");
      setIsSubmitting(false);
    }
  };

  const WIZARD_STEPS = [
    {
      num: 1,
      title: "Customer & Device",
      description:
        "Find an existing customer or create a new one, and enter the device details.",
    },
    {
      num: 2,
      title: "Issue & Condition",
      description: "Describe the problem and the physical state of the device.",
    },
    {
      num: 3,
      title: "Financials & Delivery",
      description:
        "Set the budget, record payments, and estimate the delivery date.",
    },
    {
      num: 4,
      title: "Review & Create",
      description: "Review all details before creating the job card.",
    },
  ];

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep((c) => c + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((c) => c - 1);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create New Job Card
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Fill in the details below to create a new work order.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-600 transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          <span>Step {currentStep} of 4</span>
          <span>{WIZARD_STEPS[currentStep - 1].title}</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Step Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20">
          <h2 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">
            {WIZARD_STEPS[currentStep - 1].title}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {WIZARD_STEPS[currentStep - 1].description}
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* STEP 1: CUSTOMER & DEVICE */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Customer Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Find or Create Customer
                </h3>

                <div className="space-y-4">
                  <div className="relative">
                    {selectedParty ? (
                      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-teal-900 dark:text-teal-100">
                            {selectedParty.name}
                          </h4>
                          <p className="text-sm text-teal-700 dark:text-teal-300">
                            {selectedParty.phone}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedParty(null)}
                          className="text-sm text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <PartySelector
                        type="CUSTOMER"
                        onSelect={setSelectedParty}
                        placeholder="Search by name or phone..."
                        onCreateNew={() => setShowAddCustomer(true)}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 my-6"></div>

              {/* Device Section */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Device Information
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                    Device Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="deviceType"
                    value={formData.deviceType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition text-sm shadow-sm"
                  >
                    <option value="Mobile">Mobile</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Watch">Watch</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                      Brand <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="deviceBrand"
                      value={formData.deviceBrand}
                      onChange={handleChange}
                      placeholder="e.g. Apple"
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition text-sm shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="deviceModel"
                      value={formData.deviceModel}
                      onChange={handleChange}
                      placeholder="e.g. iPhone 14 Pro"
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition text-sm shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                      IMEI / Serial No
                    </label>
                    <input
                      name="deviceSerial"
                      value={formData.deviceSerial}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition text-sm shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                      Password / Lock Code
                    </label>
                    <input
                      name="devicePassword"
                      value={formData.devicePassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition text-sm shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ISSUE & CONDITION */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Physical Condition <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="physicalCondition"
                  value={formData.physicalCondition}
                  onChange={handleChange}
                  rows={3}
                  placeholder="e.g. Back glass broken, scratches on screen..."
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Issue Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="customerComplaint"
                  value={formData.customerComplaint}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Describe the customer's complaint in detail..."
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3: FINANCIALS & DELIVERY */}
          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Estimated Budget (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="estimatedCost"
                    value={formData.estimatedCost}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Diagnostic Charge (₹)
                  </label>
                  <input
                    type="number"
                    name="diagnosticCharge"
                    value={formData.diagnosticCharge}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Advance Received (₹)
                  </label>
                  <input
                    type="number"
                    name="advancePaid"
                    value={formData.advancePaid}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Est. Delivery Date
                  </label>
                  <input
                    type="date"
                    name="estimatedDelivery"
                    value={formData.estimatedDelivery}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition"
                  />
                </div>
                {/* Bill Type is now automated and removed from UI to simplify flow */}
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
                Note: The customer will receive an SMS/WhatsApp update
                immediately after creation.
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Customer</p>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">
                      {selectedParty
                        ? selectedParty.name
                        : "N/A"}
                    </p>
                    <p className="text-gray-500">
                      {selectedParty
                        ? selectedParty.phone
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Device</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formData.deviceBrand} {formData.deviceModel}
                    </p>
                    <p className="text-gray-500">
                      {formData.deviceSerial || "No Serial"}
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-gray-500 dark:text-gray-400 mb-2">
                    Problem Description
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    {formData.customerComplaint}
                  </p>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">
                      Estimated
                    </p>
                    <p className="font-bold text-lg text-teal-600">
                      ₹{formData.estimatedCost || "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">
                      Advance
                    </p>
                    <p className="font-bold text-lg text-green-600">
                      ₹{formData.advancePaid || "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">
                      Balance
                    </p>
                    <p className="font-bold text-lg text-gray-700 dark:text-gray-300">
                      ₹
                      {(
                        (parseFloat(formData.estimatedCost || "0") || 0) -
                        (parseFloat(formData.advancePaid || "0") || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 justify-center">
                <input
                  type="checkbox"
                  id="confirm"
                  className="rounded text-teal-600 focus:ring-teal-500"
                  defaultChecked
                />
                <label htmlFor="confirm">
                  I confirm all the details are correct.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 px-8 py-5 flex justify-between items-center">
          {currentStep > 1 ? (
            <button
              onClick={prevStep}
              className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Previous
            </button>
          ) : (
            <button className="invisible">Previous</button>
          )}

          <button
            onClick={currentStep === 4 ? () => handleSubmit() : nextStep}
            disabled={isSubmitting}
            className="px-8 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Creating..."
              : currentStep === 4
                ? "Create Job Card"
                : "Next"}
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
