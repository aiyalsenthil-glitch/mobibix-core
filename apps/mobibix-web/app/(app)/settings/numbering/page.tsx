"use client";

import { useEffect, useState } from "react";
import { useShop } from "@/context/ShopContext";
import { getDocumentSettings } from "@/services/document-settings.api";
import type { DocumentNumberSetting } from "@/types/document-settings";
import { DOCUMENT_TYPE_LABELS } from "@/types/document-settings";
import { DocumentSettingCard } from "./DocumentSettingCard";

export default function DocumentNumberingSettingsPage() {
  const { selectedShopId } = useShop();
  const [settings, setSettings] = useState<DocumentNumberSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    if (!selectedShopId) {
      setError("No shop selected");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getDocumentSettings(selectedShopId);
      setSettings(data);
    } catch (err: any) {
      console.error("Error loading document settings:", err);
      setError(err.message || "Failed to load document settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [selectedShopId]);

  const handleSettingUpdated = (updatedSetting: DocumentNumberSetting) => {
    setSettings((prev) =>
      prev.map((s) =>
        s.documentType === updatedSetting.documentType ? updatedSetting : s,
      ),
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              Document Numbering
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Configure automatic numbering for invoices, job cards, and other
              documents
            </p>
          </div>

          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-slate-600 dark:text-slate-400">
              Loading settings...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              Document Numbering
            </h1>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start">
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
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error Loading Settings
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
                <button
                  onClick={loadSettings}
                  className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            Document Numbering
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Configure automatic numbering formats for different document types.
            Changes are saved immediately per document type.
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Important Notes
              </h3>
              <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>
                  Critical fields (prefix, document code) cannot be changed once
                  documents are generated
                </li>
                <li>
                  Preview numbers shown are examples only - actual numbers
                  depend on sequence state
                </li>
                <li>
                  Year format and reset policy changes take effect on next
                  document generation
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {settings.map((setting) => (
            <DocumentSettingCard
              key={setting.documentType}
              setting={setting}
              shopId={selectedShopId}
              onUpdate={handleSettingUpdated}
            />
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-sm text-slate-500 dark:text-slate-400 text-center">
          <p>
            Need help? Contact support for guidance on document numbering best
            practices.
          </p>
        </div>
      </div>
    </div>
  );
}
