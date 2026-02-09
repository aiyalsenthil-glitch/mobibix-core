"use client";

import { useState } from "react";
import { sendWhatsAppMessage } from "@/services/crm.api";

interface WhatsAppQuickActionProps {
  customerId: string;
  customerName?: string;
  phone: string;
  messageTemplate: string;
  source?: string;
  sourceId?: string;
  buttonLabel?: string;
  whatsappAllowed?: boolean;
  onSuccess?: () => void;
}

export function WhatsAppQuickAction({
  customerId,
  customerName,
  phone,
  messageTemplate,
  source,
  sourceId,
  buttonLabel = "📱 Send WhatsApp",
  whatsappAllowed = true,
  onSuccess,
}: WhatsAppQuickActionProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState(messageTemplate);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!message.trim()) {
      setError("Message cannot be empty");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await sendWhatsAppMessage({
        customerId,
        phone,
        message: message.trim(),
        source,
        sourceId,
      });

      // Success
      setShowModal(false);
      onSuccess?.();
      alert("WhatsApp message sent successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => {
          setMessage(messageTemplate);
          setShowModal(true);
        }}
        className="bg-teal-500/20 text-teal-400 border border-teal-500/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-500/30 transition-colors"
      >
        {buttonLabel}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Send WhatsApp Message</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Customer Info */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-400">To</p>
              <p className="text-sm font-medium">
                {customerName || "Customer"} - {phone}
              </p>
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                disabled={!whatsappAllowed}
                className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none ${!whatsappAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={!whatsappAllowed ? "Upgrade to PRO to send manual messages" : ""}
              />
            </div>

            {/* PRO Badge / Banner */}
            {!whatsappAllowed && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mb-4 flex items-center gap-3">
                <span className="text-xl">⭐</span>
                <div>
                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider">Pro Feature</p>
                    <p className="text-gray-300 text-[10px]">Manual messaging is available in the PRO plan.</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">⚠️ {error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={loading || !message.trim() || !whatsappAllowed}
                className={`flex-1 bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 ${!whatsappAllowed ? 'grayscale cursor-not-allowed' : ''}`}
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
