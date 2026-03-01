"use client";

import { useState, useEffect } from "react";
import {
  getShopSettings,
  updateShopSettings,
  getShopDocumentSettings,
  updateShopDocumentSetting,
  type Shop,
  type ShopDocumentSetting,
  type UpdateDocumentSettingDto,
  DocumentType,
  YearFormat,
  ResetPolicy,
  RepairInvoiceNumberingMode,
} from "@/services/shops.api";

interface ShopDocumentSettingsProps {
  shopId: string;
}

export function ShopDocumentSettings({ shopId }: ShopDocumentSettingsProps) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [settings, setSettings] = useState<ShopDocumentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [togglingMode, setTogglingMode] = useState(false);

  // Load settings
  useEffect(() => {
    loadSettings();
  }, [shopId]);



  const loadSettings = async () => {
    try {
      setLoading(true);
      const [shopData, settingsData] = await Promise.all([
        getShopSettings(shopId),
        getShopDocumentSettings(shopId)
      ]);
      setShop(shopData);
      setSettings(settingsData);
    } catch (err: unknown) {
      setError((err as any)?.message || "Failed to load document settings");
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = async (mode: RepairInvoiceNumberingMode) => {
    try {
      setTogglingMode(true);
      await updateShopSettings(shopId, { repairInvoiceNumberingMode: mode });
      // Reload to reflect changes
      await loadSettings();
    } catch (err: unknown) {
      alert("Failed to update numbering mode: " + ((err as any)?.message || "Unknown error"));
    } finally {
      setTogglingMode(false);
    }
  };

  if (loading) return <div className="text-center text-gray-500 dark:text-stone-400 py-8">Loading settings...</div>;
  if (error) return <div className="text-center text-red-500 dark:text-red-400 py-8">{error}</div>;

  return (
    <div className="bg-white dark:bg-stone-900/50 border border-gray-200 dark:border-white/5 rounded-xl p-8 animate-fade-in space-y-8 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Document Numbering</h3>
        <p className="text-sm text-gray-500 dark:text-stone-400">
          Configure how your invoice and document numbers are generated.
          <br />
          <span className="text-amber-600 dark:text-yellow-500/80 text-xs">Note: Prefixes can only be changed if no documents have been generated in the current financial period.</span>
        </p>
      </div>

      {/* Repair Invoice Mode Toggle */}
      <div className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 p-5 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Repair Invoice Strategy</h4>
        <div className="flex flex-col md:flex-row gap-4">
          <button
            onClick={() => handleModeChange(RepairInvoiceNumberingMode.SHARED)}
            disabled={togglingMode}
            className={`flex-1 p-4 rounded-lg border text-left transition ${
              shop?.repairInvoiceNumberingMode === RepairInvoiceNumberingMode.SHARED || !shop?.repairInvoiceNumberingMode
                ? "bg-teal-50 dark:bg-teal-500/10 border-teal-500 text-teal-900 dark:text-teal-100"
                : "bg-transparent border-gray-200 dark:border-white/10 text-gray-500 dark:text-stone-400 hover:bg-white dark:hover:bg-white/5"
            }`}
          >
            <div className="font-semibold mb-1">Shared Numbering</div>
            <p className="text-xs opacity-70">
              Repair invoices use the same sequence as Sales Invoices.
              <br /> Example: <code>AT-INV-2526-0123</code>
            </p>
          </button>

          <button
            onClick={() => handleModeChange(RepairInvoiceNumberingMode.SEPARATE)}
            disabled={togglingMode}
            className={`flex-1 p-4 rounded-lg border text-left transition ${
              shop?.repairInvoiceNumberingMode === RepairInvoiceNumberingMode.SEPARATE
                ? "bg-teal-50 dark:bg-teal-500/10 border-teal-500 text-teal-900 dark:text-teal-100"
                : "bg-transparent border-gray-200 dark:border-white/10 text-gray-500 dark:text-stone-400 hover:bg-white dark:hover:bg-white/5"
            }`}
          >
            <div className="font-semibold mb-1">Separate Numbering</div>
            <p className="text-xs opacity-70">
              Repair invoices have their own unique sequence.
              <br /> Example: <code>AT-RI-2526-0001</code>
            </p>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {settings.map((setting) => (
          <DocumentSettingCard 
            key={setting.id} 
            setting={setting} 
            shopId={shopId}
            onUpdate={loadSettings}
            isEditing={editingType === setting.documentType}
            onEdit={() => setEditingType(setting.documentType)}
            onCancel={() => setEditingType(null)}
          />
        ))}
      </div>
    </div>
  );
}

// Sub-component for individual setting row
function DocumentSettingCard({ 
  setting, 
  shopId, 
  onUpdate,
  isEditing,
  onEdit,
  onCancel
}: { 
  setting: ShopDocumentSetting; 
  shopId: string;
  onUpdate: () => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<UpdateDocumentSettingDto>({
    prefix: setting.prefix,
    separator: setting.separator,
    documentCode: setting.documentCode,
    yearFormat: setting.yearFormat,
    numberLength: setting.numberLength,
    resetPolicy: setting.resetPolicy,
    currentNumber: setting.currentNumber,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await updateShopDocumentSetting(shopId, setting.documentType, formData);
      onUpdate();
      onCancel();
    } catch (err: unknown) {
      setSaveError((err as any)?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  // Preview generation
  const today = new Date();
  const fy = today.getMonth() >= 3 
    ? `${String(today.getFullYear()).slice(-2)}${String(today.getFullYear() + 1).slice(-2)}`
    : `${String(today.getFullYear() - 1).slice(-2)}${String(today.getFullYear()).slice(-2)}`;
  
  let yearStr = "";
  if (formData.yearFormat === "FY") yearStr = fy;
  else if (formData.yearFormat === "YYYY") yearStr = `${today.getFullYear()}${today.getFullYear()+1}`;
  else if (formData.yearFormat === "YY") yearStr = String(today.getFullYear()).slice(-2);

  const parts = [formData.prefix, formData.documentCode];
  if (yearStr) parts.push(yearStr);
  parts.push("1".padStart(formData.numberLength || 4, "0"));
  const preview = parts.join(formData.separator);

  if (!isEditing) {
      return (
        <div className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-lg p-5 flex items-center justify-between hover:border-gray-300 dark:hover:border-white/10 transition">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                        {setting.documentType.replace(/_/g, " ")}
                    </h4>
                    <span className="text-xs px-2 py-0.5 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-full border border-teal-200 dark:border-teal-500/20">
                        {setting.prefix}
                    </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-stone-500 font-mono">
                    Next: {preview.replace('1', String((formData.currentNumber ?? setting.currentNumber ?? 0) + 1).padStart(formData.numberLength || setting.numberLength || 4, '0'))}
                </div>
            </div>
            <button 
                onClick={() => {
                  setFormData({
                    prefix: setting.prefix,
                    separator: setting.separator,
                    documentCode: setting.documentCode,
                    yearFormat: setting.yearFormat,
                    numberLength: setting.numberLength,
                    resetPolicy: setting.resetPolicy,
                  });
                  onEdit();
                }}
                className="px-4 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-transparent hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-white rounded-lg transition"
            >
                Configure
            </button>
        </div>
      );
  }

  return (
      <form onSubmit={handleSubmit} className="bg-white dark:bg-black/40 border border-teal-500 rounded-lg p-6 space-y-6 shadow-md">
          <div className="flex justify-between items-start">
             <h4 className="font-medium text-gray-900 dark:text-white mb-4">Edit {setting.documentType.replace(/_/g, " ")}</h4>
             <div className="bg-gray-100 dark:bg-stone-900 px-3 py-1 rounded text-xs text-gray-600 dark:text-stone-400 font-mono border border-gray-200 dark:border-white/10">
                Preview: <span className="text-teal-600 dark:text-teal-400">{preview}</span>
             </div>
          </div>
          
          {saveError && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded text-red-600 dark:text-red-400 text-sm">
                {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-stone-500 mb-2">Prefix</label>
                  <input 
                    type="text" 
                    value={formData.prefix} 
                    onChange={(e) => setFormData({...formData, prefix: e.target.value.toUpperCase()})}
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none uppercase"
                    maxLength={10}
                  />
                  <p className="text-[10px] text-gray-500 dark:text-stone-500 mt-1">Shop identifier (e.g. HP, DL)</p>
              </div>
              <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-stone-500 mb-2">Doc Code</label>
                  <input 
                    type="text" 
                    value={formData.documentCode} 
                    onChange={(e) => setFormData({...formData, documentCode: e.target.value.toUpperCase()})}
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none uppercase"
                    maxLength={5}
                  />
                  <p className="text-[10px] text-gray-500 dark:text-stone-500 mt-1">Type identifier (e.g. INV, S, CN)</p>
              </div>
              
              <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-stone-500 mb-2">Separator</label>
                  <select 
                    value={formData.separator}
                    onChange={(e) => setFormData({...formData, separator: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                      <option value="-">- (Dash)</option>
                      <option value="/">/ (Slash)</option>
                  </select>
              </div>

              <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-stone-500 mb-2">Year Format</label>
                  <select 
                    value={formData.yearFormat}
                    onChange={(e) => setFormData({...formData, yearFormat: e.target.value as YearFormat})}
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                      <option value="FY">Financial Year (2526)</option>
                      <option value="YYYY">Full Year (20252026)</option>
                      <option value="YY">Ending Year (26)</option>
                      <option value="NONE">None</option>
                  </select>
              </div>

              <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-stone-500 mb-2">Number Length</label>
                  <input 
                    type="number" 
                    min={3}
                    max={8}
                    value={formData.numberLength} 
                    onChange={(e) => setFormData({...formData, numberLength: parseInt(e.target.value)})}
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-500 dark:text-stone-500 mt-1">Zero-padding (e.g. 4 → 0001)</p>
              </div>

              <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-stone-500 mb-2">Reset Policy</label>
                  <select 
                    value={formData.resetPolicy}
                    onChange={(e) => setFormData({...formData, resetPolicy: e.target.value as ResetPolicy})}
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                      <option value="YEARLY">Yearly (April 1st)</option>
                      {/* <option value="MONTHLY">Monthly</option> */}
                      <option value="NEVER">Never Reset</option>
                  </select>
              </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={onCancel}
                className="px-4 py-2 text-sm bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-stone-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={saving}
                className="px-6 py-2 text-sm bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
          </div>
      </form>
  )
}
