"use client";

import { useState, useEffect } from "react";
import { updateDocumentSetting } from "@/services/document-settings.api";
import type {
  DocumentNumberSetting,
  YearFormat,
  ResetPolicy,
  UpdateDocumentSettingDto,
} from "@/types/document-settings";
import {
  DOCUMENT_TYPE_LABELS,
  YEAR_FORMAT_LABELS,
  RESET_POLICY_LABELS,
  SEPARATOR_OPTIONS,
  NUMBER_LENGTH_OPTIONS,
} from "@/types/document-settings";
import { generatePreviewNumber } from "@/utils/document-preview";

interface DocumentSettingCardProps {
  setting: DocumentNumberSetting;
  shopId: string;
  onUpdate: (updated: DocumentNumberSetting) => void;
}

export function DocumentSettingCard({
  setting,
  shopId,
  onUpdate,
}: DocumentSettingCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable fields
  const [separator, setSeparator] = useState(setting.separator);
  const [yearFormat, setYearFormat] = useState(setting.yearFormat);
  const [numberLength, setNumberLength] = useState(setting.numberLength);
  const [resetPolicy, setResetPolicy] = useState(setting.resetPolicy);

  // Track if values have changed
  const [hasChanges, setHasChanges] = useState(false);

  // Check if critical fields are locked (documents exist)
  const isLocked = setting.currentNumber > 0;

  // Update local state when prop changes
  useEffect(() => {
    setSeparator(setting.separator);
    setYearFormat(setting.yearFormat);
    setNumberLength(setting.numberLength);
    setResetPolicy(setting.resetPolicy);
    setHasChanges(false);
  }, [setting]);

  // Check for changes
  useEffect(() => {
    const changed =
      separator !== setting.separator ||
      yearFormat !== setting.yearFormat ||
      numberLength !== setting.numberLength ||
      resetPolicy !== setting.resetPolicy;
    setHasChanges(changed);
  }, [separator, yearFormat, numberLength, resetPolicy, setting]);

  // Generate preview
  const previewNumber = generatePreviewNumber(
    setting.prefix,
    setting.documentCode,
    separator,
    yearFormat,
    numberLength,
    setting.currentNumber + 1, // Next number
  );

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    // Confirmation for critical changes
    if (
      isLocked &&
      (yearFormat !== setting.yearFormat || resetPolicy !== setting.resetPolicy)
    ) {
      const confirmMessage =
        "You are changing year format or reset policy on a document type that has existing documents. " +
        "This may affect numbering continuity. Continue?";

      if (!confirm(confirmMessage)) {
        return;
      }
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const updates: UpdateDocumentSettingDto = {
        separator,
        yearFormat,
        numberLength,
        resetPolicy,
      };

      const updated = await updateDocumentSetting(
        shopId,
        setting.documentType,
        updates,
      );

      onUpdate(updated);
      setIsEditing(false);
      setSaveSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error saving settings:", err);
      setSaveError(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setSeparator(setting.separator);
    setYearFormat(setting.yearFormat);
    setNumberLength(setting.numberLength);
    setResetPolicy(setting.resetPolicy);
    setIsEditing(false);
    setSaveError(null);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {DOCUMENT_TYPE_LABELS[setting.documentType]}
          </h3>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Current:{" "}
              <span className="font-mono font-medium text-slate-900 dark:text-slate-50">
                {setting.currentNumber}
              </span>{" "}
              documents
            </span>
            {isLocked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Limited Editing
              </span>
            )}
          </div>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Edit Settings
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        {/* Save Success Message */}
        {saveSuccess && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Settings saved successfully
            </span>
          </div>
        )}

        {/* Save Error Message */}
        {saveError && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg
                className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error Saving Settings
                </h4>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {saveError}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Fixed Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prefix
                {isLocked && (
                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                    (Locked)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={setting.prefix}
                disabled
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed text-sm font-mono"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Shop identifier (cannot be changed)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Document Code
                {isLocked && (
                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                    (Locked)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={setting.documentCode}
                disabled
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed text-sm font-mono"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Document type identifier (cannot be changed)
              </p>
            </div>

            {/* Separator */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Separator
              </label>
              <select
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 text-sm disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:cursor-not-allowed"
              >
                {SEPARATOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Number Padding */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Number Padding
              </label>
              <select
                value={numberLength}
                onChange={(e) => setNumberLength(parseInt(e.target.value))}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 text-sm disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:cursor-not-allowed"
              >
                {NUMBER_LENGTH_OPTIONS.map((len) => (
                  <option key={len} value={len}>
                    {len} digits (
                    {len === 4
                      ? "0001"
                      : len === 3
                        ? "001"
                        : len === 5
                          ? "00001"
                          : "000001"}
                    )
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column - Configurable Fields */}
          <div className="space-y-4">
            {/* Year Format */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Year Format
                {isLocked && (
                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                    (⚠ Affects numbering)
                  </span>
                )}
              </label>
              <select
                value={yearFormat}
                onChange={(e) => setYearFormat(e.target.value as YearFormat)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 text-sm disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:cursor-not-allowed"
              >
                {Object.entries(YEAR_FORMAT_LABELS).map(
                  ([value, { label, example }]) => (
                    <option key={value} value={value}>
                      {label} {example && `- Example: ${example}`}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Reset Policy */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reset Policy
                {isLocked && (
                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                    (⚠ Affects numbering)
                  </span>
                )}
              </label>
              <select
                value={resetPolicy}
                onChange={(e) => setResetPolicy(e.target.value as ResetPolicy)}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 text-sm disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:cursor-not-allowed"
              >
                {Object.entries(RESET_POLICY_LABELS).map(
                  ([value, { label, description }]) => (
                    <option key={value} value={value}>
                      {label} - {description}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Preview */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Preview (Next Number)
              </label>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-wide">
                  {previewNumber}
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  This is a preview based on current settings. Actual numbers
                  may vary based on sequence state.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
