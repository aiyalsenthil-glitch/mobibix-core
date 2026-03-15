"use client";

import { useState, useEffect } from "react";
import { 
  getWhatsAppStatus, 
  manualSyncWhatsApp, 
  disconnectWhatsApp,
  WhatsAppStatus 
} from "@/services/whatsapp.api";

interface WhatsAppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

export default function WhatsAppSettingsModal({
  isOpen,
  onClose,
  onStatusChange,
}: WhatsAppSettingsModalProps) {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSyncForm, setShowSyncForm] = useState(false);
  const [formData, setFormData] = useState({
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
    phoneNumber: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  async function fetchStatus() {
    setLoading(true);
    setError(null);
    try {
      const data = await getWhatsAppStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSync(e: React.FormEvent) {
    e.preventDefault();
    setSyncing(true);
    setError(null);
    try {
      await manualSyncWhatsApp(formData);
      await fetchStatus();
      setShowSyncForm(false);
      onStatusChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect WhatsApp? This will stop all automation and messages.")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await disconnectWhatsApp();
      await fetchStatus();
      onStatusChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-teal-600">⚙️</span> WhatsApp Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading details...</p>
            </div>
          ) : error ? (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
              ⚠️ {error}
            </div>
          ) : status?.status === "DISCONNECTED" && !showSyncForm ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔌</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Not Connected</h3>
              <p className="text-gray-500 mb-6 font-medium">Your WhatsApp Business account is not linked.</p>
              <button 
                onClick={() => setShowSyncForm(true)}
                className="text-teal-600 font-bold hover:underline"
              >
                Advanced: Manual Sync
              </button>
            </div>
          ) : showSyncForm ? (
            <form onSubmit={handleManualSync} className="space-y-4">
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-6">
                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                  <strong>Note:</strong> Manual sync is for accounts already registered on Meta. Providing incorrect IDs will break messaging.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">WABA ID</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 2390091688105540"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  value={formData.wabaId}
                  onChange={(e) => setFormData({ ...formData, wabaId: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Phone Number ID</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 1042097638975961"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  value={formData.phoneNumberId}
                  onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Access Token</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Paste your Meta System User token"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none"
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Phone Number (Clean)</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 919876543210"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowSyncForm(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-lg shadow-teal-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {syncing ? "Syncing..." : "Finalize Sync"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-teal-50 p-4 rounded-2xl border border-teal-100">
                <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white text-xl">
                  📱
                </div>
                <div>
                  <div className="text-sm font-bold text-teal-900 leading-none mb-1">{status?.phoneNumber || "Connected Number"}</div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-teal-600">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
                    {status?.status}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">WABA ID</div>
                  <div className="font-mono text-sm text-gray-700">{status?.wabaId}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone ID</div>
                  <div className="font-mono text-sm text-gray-700">{status?.phoneNumberId}</div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <button
                  onClick={handleDisconnect}
                  className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <span>⚠️</span> Disconnect Integration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
