"use client";

import { useState, useEffect } from "react";
import {
  createJobCard,
  updateJobCard,
  type JobCard,
  type CreateJobCardDto,
  type UpdateJobCardDto,
} from "@/services/jobcard.api";

interface JobCardModalProps {
  shopId: string;
  jobCard: JobCard | null;
  onClose: () => void;
}

export function JobCardModal({ shopId, jobCard, onClose }: JobCardModalProps) {
  const isEdit = !!jobCard;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerName: jobCard?.customerName || "",
    customerPhone: jobCard?.customerPhone || "",
    customerAltPhone: jobCard?.customerAltPhone || "",
    deviceType: jobCard?.deviceType || "",
    deviceBrand: jobCard?.deviceBrand || "",
    deviceModel: jobCard?.deviceModel || "",
    deviceSerial: jobCard?.deviceSerial || "",
    customerComplaint: jobCard?.customerComplaint || "",
    physicalCondition: jobCard?.physicalCondition || "",
    estimatedCost: jobCard?.estimatedCost?.toString() || "",
    advancePaid: jobCard?.advancePaid?.toString() || "",
    estimatedDelivery: jobCard?.estimatedDelivery
      ? new Date(jobCard.estimatedDelivery).toISOString().split("T")[0]
      : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CreateJobCardDto | UpdateJobCardDto = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerAltPhone: formData.customerAltPhone || undefined,
        deviceType: formData.deviceType,
        deviceBrand: formData.deviceBrand,
        deviceModel: formData.deviceModel,
        deviceSerial: formData.deviceSerial || undefined,
        customerComplaint: formData.customerComplaint,
        physicalCondition: formData.physicalCondition || undefined,
        estimatedCost: formData.estimatedCost
          ? parseFloat(formData.estimatedCost)
          : undefined,
        advancePaid: formData.advancePaid
          ? parseFloat(formData.advancePaid)
          : undefined,
        estimatedDelivery: formData.estimatedDelivery || undefined,
      };

      if (isEdit) {
        await updateJobCard(shopId, jobCard.id, payload);
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 border border-white/10 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">
            {isEdit ? "Edit Job Card" : "Create Job Card"}
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Customer Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  name="customerAltPhone"
                  value={formData.customerAltPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Device Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Device Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Device Type <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="deviceType"
                  value={formData.deviceType}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Smartphone, Tablet"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Brand <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="deviceBrand"
                  value={formData.deviceBrand}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Apple, Samsung"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Model <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="deviceModel"
                  value={formData.deviceModel}
                  onChange={handleChange}
                  required
                  placeholder="e.g., iPhone 14 Pro"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Serial/IMEI
                </label>
                <input
                  type="text"
                  name="deviceSerial"
                  value={formData.deviceSerial}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Repair Details */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Repair Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Customer Complaint <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="customerComplaint"
                  value={formData.customerComplaint}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder="Describe the issue..."
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Physical Condition
                </label>
                <textarea
                  name="physicalCondition"
                  value={formData.physicalCondition}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Note any scratches, dents, etc."
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Delivery */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Pricing & Delivery
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Estimated Cost
                </label>
                <input
                  type="number"
                  name="estimatedCost"
                  value={formData.estimatedCost}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Advance Paid
                </label>
                <input
                  type="number"
                  name="advancePaid"
                  value={formData.advancePaid}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Est. Delivery
                </label>
                <input
                  type="date"
                  name="estimatedDelivery"
                  value={formData.estimatedDelivery}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-white rounded-lg transition"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
