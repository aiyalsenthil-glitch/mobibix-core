"use client";

import { useState, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";
import { authenticatedFetch } from "@/services/auth.api";

interface ImportResult {
  success: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface ImportProductsModalProps {
  shopId: string;
  onClose: () => void;
  onImportComplete: () => void;
}

export function ImportProductsModal({
  shopId,
  onClose,
  onImportComplete,
}: ImportProductsModalProps) {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [includeStock, setIncludeStock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      if (
        !validTypes.includes(selectedFile.type) &&
        !selectedFile.name.endsWith(".csv")
      ) {
        setError("Please select a valid CSV or Excel file");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const downloadTemplate = () => {
    const headers = includeStock
      ? [
          "Product Name",
          "Category",
          "Product Type",
          "Selling Price",
          "GST Rate",
          "HSN Code",
          "Inventory Tracked",
          "Opening Stock",
        ]
      : [
          "Product Name",
          "Category",
          "Product Type",
          "Selling Price",
          "GST Rate",
          "HSN Code",
          "Inventory Tracked",
        ];

    const sampleData = includeStock
      ? [
          [
            "Sample Product",
            "Electronics",
            "GOODS",
            "1000",
            "18",
            "8517",
            "Yes",
            "50",
          ],
        ]
      : [
          [
            "Sample Product",
            "Electronics",
            "GOODS",
            "1000",
            "18",
            "8517",
            "Yes",
          ],
        ];

    const csvContent = [headers, ...sampleData]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_import_template${includeStock ? "_with_stock" : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a file to import");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("shopId", shopId);
      formData.append("includeStock", includeStock.toString());

      // Call backend API to import products
      const response = await authenticatedFetch("/mobileshop/products/import", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to import products");
      }

      const data = await response.json();
      setResult(data);

      if (data.success > 0) {
        setTimeout(() => {
          onImportComplete();
          if (data.failed === 0) {
            onClose();
          }
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to import products");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`w-full max-w-2xl rounded-lg shadow-xl ${
          theme === "dark"
            ? "bg-gray-900 border border-white/10"
            : "bg-white border border-gray-200"
        } max-h-[90vh] overflow-y-auto`}
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
              Import Products
            </h2>
            <p
              className={`text-sm mt-1 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Upload CSV or Excel file to bulk import products
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
        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div
            className={`p-4 rounded-lg border ${
              theme === "dark"
                ? "bg-blue-500/10 border-blue-500/30"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <h3
              className={`font-semibold mb-2 ${
                theme === "dark" ? "text-blue-300" : "text-blue-900"
              }`}
            >
              Import Instructions
            </h3>
            <ul
              className={`text-sm space-y-1 list-disc list-inside ${
                theme === "dark" ? "text-blue-400" : "text-blue-700"
              }`}
            >
              <li>Download the template and fill in product details</li>
              <li>Product Type must be: GOODS, SPARE, or SERVICE</li>
              <li>Inventory Tracked: Yes or No</li>
              <li>
                Opening stock is optional (requires Inventory Tracked = Yes)
              </li>
              <li>Duplicate products will be skipped automatically</li>
            </ul>
          </div>

          {/* Options */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeStock}
                onChange={(e) => setIncludeStock(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span
                className={`text-sm font-medium ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Include opening stock quantities
              </span>
            </label>
          </div>

          {/* Template Download */}
          <div>
            <button
              onClick={downloadTemplate}
              className={`w-full px-4 py-3 border-2 border-dashed rounded-lg transition flex items-center justify-center gap-2 ${
                theme === "dark"
                  ? "border-gray-600 hover:border-gray-500 text-gray-300"
                  : "border-gray-300 hover:border-gray-400 text-gray-700"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download CSV Template
            </button>
          </div>

          {/* File Upload */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Upload File <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                theme === "dark"
                  ? "border-gray-600 hover:border-gray-500"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="w-8 h-8 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div>
                    <p
                      className={`font-medium ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p
                    className={`mt-2 text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    CSV or Excel files
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={`p-4 rounded-lg border ${
                result.failed > 0
                  ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-500/20 dark:border-yellow-500/50"
                  : "bg-green-50 border-green-200 dark:bg-green-500/20 dark:border-green-500/50"
              }`}
            >
              <h3
                className={`font-semibold mb-2 ${
                  result.failed > 0
                    ? "text-yellow-900 dark:text-yellow-300"
                    : "text-green-900 dark:text-green-300"
                }`}
              >
                Import Summary
              </h3>
              <div className="space-y-1 text-sm">
                <p className="text-green-700 dark:text-green-300">
                  ✓ {result.success} products imported successfully
                </p>
                {result.skipped > 0 && (
                  <p className="text-yellow-700 dark:text-yellow-300">
                    ⚠ {result.skipped} products skipped (duplicates)
                  </p>
                )}
                {result.failed > 0 && (
                  <p className="text-red-700 dark:text-red-300">
                    ✗ {result.failed} products failed
                  </p>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                    Errors:
                  </p>
                  <ul className="text-xs space-y-1 list-disc list-inside text-red-600 dark:text-red-400">
                    {result.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>... and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
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
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={isSubmitting || !file}
              className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
            >
              {isSubmitting ? "Importing..." : "Import Products"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
