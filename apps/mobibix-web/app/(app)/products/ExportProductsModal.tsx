"use client";

import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";

interface ExportProductsModalProps {
  shopId: string;
  shopName: string;
  onClose: () => void;
}

export function ExportProductsModal({
  shopId,
  shopName,
  onClose,
}: ExportProductsModalProps) {
  const { theme } = useTheme();
  const [includeStock, setIncludeStock] = useState(false);
  const [format, setFormat] = useState<"csv" | "excel">("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);

      // TODO: Call backend API to export products
      const response = await fetch(
        `/api/products/export?shopId=${shopId}&includeStock=${includeStock}&format=${format}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to export products");
      }

      // Download file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `${shopName.replace(/\s+/g, "_")}_products_${timestamp}${includeStock ? "_with_stock" : ""}.${format === "excel" ? "xlsx" : "csv"}`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to export products");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`w-full max-w-md rounded-lg shadow-xl ${
          theme === "dark"
            ? "bg-gray-900 border border-white/10"
            : "bg-white border border-gray-200"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${
            theme === "dark" ? "border-white/10" : "border-gray-200"
          }`}
        >
          <div>
            <h2
              className={`text-xl font-bold ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Export Products
            </h2>
            <p
              className={`text-sm mt-1 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Download product data for {shopName}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`text-2xl ${
              theme === "dark"
                ? "text-gray-400 hover:text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Format Selection */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat("csv")}
                className={`px-4 py-3 rounded-lg border-2 transition ${
                  format === "csv"
                    ? "border-teal-600 bg-teal-50 dark:bg-teal-900/20"
                    : theme === "dark"
                      ? "border-gray-600 hover:border-gray-500"
                      : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div
                  className={`text-sm font-medium ${
                    format === "csv"
                      ? "text-teal-600 dark:text-teal-400"
                      : theme === "dark"
                        ? "text-gray-300"
                        : "text-gray-700"
                  }`}
                >
                  CSV
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Compatible with Excel
                </div>
              </button>
              <button
                onClick={() => setFormat("excel")}
                className={`px-4 py-3 rounded-lg border-2 transition ${
                  format === "excel"
                    ? "border-teal-600 bg-teal-50 dark:bg-teal-900/20"
                    : theme === "dark"
                      ? "border-gray-600 hover:border-gray-500"
                      : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div
                  className={`text-sm font-medium ${
                    format === "excel"
                      ? "text-teal-600 dark:text-teal-400"
                      : theme === "dark"
                        ? "text-gray-300"
                        : "text-gray-700"
                  }`}
                >
                  Excel
                </div>
                <div className="text-xs text-gray-500 mt-1">.xlsx format</div>
              </button>
            </div>
          </div>

          {/* Options */}
          <div>
            <label
              className={`block text-sm font-medium mb-3 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Export Options
            </label>
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                theme === "dark"
                  ? "border-gray-700 hover:bg-white/5"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={includeStock}
                onChange={(e) => setIncludeStock(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-teal-600 rounded focus:ring-teal-500"
              />
              <div className="flex-1">
                <div
                  className={`text-sm font-medium ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Include stock quantities
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Export current available stock for each product
                </div>
              </div>
            </label>
          </div>

          {/* Export Info */}
          <div
            className={`p-3 rounded-lg text-xs ${
              theme === "dark"
                ? "bg-blue-500/10 text-blue-400"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            <strong>Exported fields:</strong> Product Name, Category, Type,
            Selling Price, GST Rate, HSN Code, Active Status
            {includeStock && ", Current Stock"}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex gap-3 p-6 border-t ${
            theme === "dark" ? "border-white/10" : "border-gray-200"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Exporting...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
