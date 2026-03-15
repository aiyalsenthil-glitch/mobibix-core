import { useEffect, useState, useRef } from "react";
import {
  getWhatsAppLogs,
  WhatsAppLog,
  sendWhatsAppMessage,
} from "@/services/whatsapp.api";
import { useWhatsAppNumber } from "@/context/WhatsAppNumberContext";
import { NumberSelector } from "../../whatsapp/components/NumberSelector";

type InboxProps = {
  tenantId?: string;
  disabled?: boolean;
  sendingNumber?: string | null;
};

export default function WhatsAppRetailInbox({
  disabled = false,
  sendingNumber,
  tenantId,
}: InboxProps) {
  const [conversations, setConversations] = useState<
    Record<string, WhatsAppLog[]>
  >({});
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { selectedNumberId } = useWhatsAppNumber();

  // 1. Fetch Logs
  useEffect(() => {
    if (disabled) return;
    loadLogs();
    const interval = setInterval(loadLogs, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [disabled, selectedNumberId]); // Reload when filter changes

  useEffect(() => {
    setSelectedPhone(null);
  }, [selectedNumberId]);

  async function loadLogs() {
    if (disabled) return;
    try {
      // Pass filterNumberId if specific number selected
      const query =
        selectedNumberId !== "ALL"
          ? { whatsAppNumberId: selectedNumberId }
          : {};
      const logs = await getWhatsAppLogs(query);

      // Group by phone
      const grouped: Record<string, WhatsAppLog[]> = {};
      logs.forEach((log) => {
        const phone = log.phone;
        if (!grouped[phone]) grouped[phone] = [];
        grouped[phone].push(log);
      });
      // Sort logs within groups (oldest to newest)
      Object.keys(grouped).forEach((key) => {
        grouped[key].sort(
          (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
        );
      });
      setConversations(grouped);

      // Auto-select first if none selected
      if (!selectedPhone && Object.keys(grouped).length > 0) {
        const sortedPhones = Object.keys(grouped).sort((a, b) => {
          const lastA = grouped[a][grouped[a].length - 1];
          const lastB = grouped[b][grouped[b].length - 1];
          return (
            new Date(lastB.sentAt).getTime() - new Date(lastA.sentAt).getTime()
          );
        });
        setSelectedPhone(sortedPhones[0]);
      }
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes("PLAN_REQUIRED") ||
          err.message.includes("upgrade"))
      ) {
        console.warn("WhatsApp logs access restricted:", err.message);
      } else {
        console.error("Failed to load WhatsApp logs", err);
      }
    }
  }

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedPhone, conversations]);

  async function handleSend() {
    if (!selectedPhone || !replyText.trim() || disabled) return;
    setSending(true);
    try {
      await sendWhatsAppMessage({
        phone: selectedPhone,
        text: replyText,
        whatsAppNumberId:
          selectedNumberId !== "ALL" ? selectedNumberId : undefined,
      });

      setReplyText("");
      loadLogs();
    } catch (err) {
      alert("Failed to send message: " + (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const sortedPhones = Object.keys(conversations).sort((a, b) => {
    const lastA = conversations[a][conversations[a].length - 1];
    const lastB = conversations[b][conversations[b].length - 1];
    return new Date(lastB.sentAt).getTime() - new Date(lastA.sentAt).getTime();
  });

  const activeLogs = selectedPhone ? conversations[selectedPhone] || [] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 bg-white rounded-lg shadow-sm h-[650px] overflow-hidden border border-gray-200 font-sans">
      {/* LEFT: Conversation List */}
      <div
        className={`border-r border-gray-200 flex-col bg-white h-full overflow-hidden ${selectedPhone ? "hidden lg:flex" : "flex"}`}
      >
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 backdrop-blur">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-gray-800">Inbox</h2>
            <NumberSelector />
          </div>
          <p className="text-xs text-gray-500">
            {sortedPhones.length} active conversations
          </p>
        </div>
        <div className="overflow-y-auto flex-1">
          {sortedPhones.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-4xl mb-3 opacity-20">👥</div>
              <p className="text-sm">
                No active conversations found.
                <br />
                <span className="text-xs opacity-70">
                  (Live updates might be restricted)
                </span>
              </p>
            </div>
          ) : (
            sortedPhones.map((phone) => {
              const logs = conversations[phone];
              const lastLog = logs[logs.length - 1];
              const isSelected = phone === selectedPhone;

              return (
                <div
                  key={phone}
                  onClick={() => setSelectedPhone(phone)}
                  className={`p-4 border-b border-gray-50 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-teal-50/50 border-teal-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`font-medium ${isSelected ? "text-teal-900" : "text-gray-900"}`}
                    >
                      {phone}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                      {new Date(lastLog.sentAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500 truncate flex-1 leading-snug">
                      {getLogDescription(lastLog)}
                    </p>
                    {getIntentBadge(deriveCustomerIntent(logs))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Timeline View */}
      <div
        className={`lg:col-span-2 flex-col bg-gray-50/30 h-full overflow-hidden ${selectedPhone ? "flex" : "hidden lg:flex"}`}
      >
        {!selectedPhone ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 bg-gradient-to-b from-white to-gray-50">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 border border-gray-100 text-5xl">
              💬
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Retail Inbox
            </h3>
            <p className="max-w-xs text-center text-sm text-gray-500 leading-relaxed">
              Select a customer conversation from the left to view activity
              timeline and manage manual staff intervention.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 text-[10px] uppercase tracking-widest font-bold">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Live Automation
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Staff Handover
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10 sticky top-0">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedPhone(null)}
                  className="lg:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    ></path>
                  </svg>
                </button>

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold shadow-sm">
                  {selectedPhone.slice(-2)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">
                    {selectedPhone}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    WhatsApp Active
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {getIntentBadge(deriveCustomerIntent(activeLogs))}
                <span className="hidden sm:inline-block px-2.5 py-1 bg-white border border-gray-200 text-gray-600 text-xs rounded-lg font-medium shadow-sm">
                  Retail Customer
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50">
              <div className="flex justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
                  Activity Log
                </span>
              </div>

              {activeLogs.map((log) => (
                <div key={log.id} className="relative flex gap-6 group">
                  {/* Line */}
                  <div className="absolute top-0 bottom-0 left-[19px] w-0.5 bg-gray-200 -z-10 group-last:bottom-auto group-last:h-full"></div>

                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-gray-50 shadow-sm z-0 ${getStatusColor(log.type)}`}
                  >
                    {getStatusIcon(log.type)}
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        {getLogTitle(log)}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(log.sentAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                      {getLogDescription(log)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* STAFF ATTENTION BANNER */}
            {deriveCustomerIntent(activeLogs) === "STAFF" &&
              activeLogs[activeLogs.length - 1].type !== "MANUAL" && (
                <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-3 animate-pulse">
                  <span className="text-amber-500 text-lg">⚠️</span>
                  <p className="text-xs font-bold text-amber-800">
                    ACTION REQUIRED: Customer requested staff handover.
                    Automation paused.
                  </p>
                </div>
              )}

            {/* Reply Input Area */}
            <div className="p-5 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 transition-all duration-300 bg-white">
                <textarea
                  disabled={disabled}
                  className={`w-full pl-5 pr-16 py-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none bg-transparent ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  rows={2}
                  placeholder={
                    disabled
                      ? "Upgrade to PRO to reply..."
                      : "Type a manual reply to take over from automation..."
                  }
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <button
                    onClick={handleSend}
                    disabled={sending || !replyText.trim() || disabled}
                    className={`p-2.5 bg-gradient-to-tr from-teal-600 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/30 disabled:opacity-30 disabled:hover:shadow-none transition-all duration-300 active:scale-95 ${disabled ? "grayscale" : ""}`}
                    title={disabled ? "Upgrade to send" : "Send Message"}
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg
                        className="w-5 h-5 transform rotate-90"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="mt-3 flex justify-between items-center px-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${sendingNumber ? "bg-green-500" : "bg-teal-500 animate-pulse"}`}
                  ></span>
                  <span className="text-[10px] font-medium text-gray-500">
                    {sendingNumber
                      ? `Sending as: ${sendingNumber}`
                      : "Retail Demo Mode Active"}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 italic">
                  Enter to send • Shift+Enter for new line
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Helpers & Logic ---

function deriveCustomerIntent(
  logs: WhatsAppLog[],
): "PRODUCT" | "BULK" | "STAFF" | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    if (log.type === "INCOMING") {
      const text = getMessageBody(log)?.toLowerCase() || "";

      if (text === "1" || text.includes("product") || text.includes("stock"))
        return "PRODUCT";
      if (text === "2" || text.includes("bulk") || text.includes("wholesale"))
        return "BULK";
      if (text === "3" || text.includes("staff") || text.includes("human"))
        return "STAFF";
    }
  }
  return null;
}

function getMessageBody(log: WhatsAppLog): string | null {
  if (!log.metadata) return null;
  const meta = log.metadata as any;
  // Handle Text
  if (meta.type === "text" && meta.text)
    return meta.text.body;
  // Handle Interactive (Simple)
  if (meta.type === "interactive") {
    const interactive = meta.interactive;
    if (interactive?.button_reply) return interactive.button_reply.id;
    if (interactive?.list_reply) return interactive.list_reply.id;
  }
  return null;
}

function getLogTitle(log: WhatsAppLog) {
  if (log.type === "INCOMING") return "Customer message";
  if (log.type === "WELCOME") return "Greeting sent";
  if (log.type === "REMINDER") return "Follow-up sent";
  if (log.type === "MANUAL") return "Staff handover";
  return "System activity";
}

function getLogDescription(log: WhatsAppLog) {
  // Incoming (User Reply)
  if (log.type === "INCOMING") {
    const text = getMessageBody(log);
    if (!text) return "Sent an attachment or generic message";

    // Semantic mapping for Demo
    if (text === "1" || text.includes("product"))
      return "Enquired about product catalog";
    if (text === "2" || text.includes("bulk"))
      return "Interested in bulk/wholesale deal";
    if (text === "3" || text.includes("staff"))
      return "Requested to speak with a human";

    return `"${text}"`;
  }

  // Outgoing (System/Staff)
  if (log.metadata && log.metadata["parameters"]) {
    const params = log.metadata["parameters"] as string[];
    return `Broadcast: ${params.join(", ")}`;
  }
  if (log.metadata && log.metadata["text_snippet"]) {
    return String(log.metadata["text_snippet"]);
  }

  if (log.type === "WELCOME") return "Retail welcome flow triggered";
  if (log.type === "MANUAL") return "Staff took over the conversation";
  if (log.type === "REMINDER") return "Automated engagement reminder";

  return `Service message (${log.type?.toLowerCase()})`;
}

function getStatusColor(type: string) {
  if (type === "INCOMING") return "bg-white text-blue-500 border-blue-100";
  if (type === "WELCOME") return "bg-white text-teal-500 border-teal-100";
  if (type === "REMINDER") return "bg-white text-orange-500 border-orange-100";
  if (type === "MANUAL") return "bg-white text-indigo-500 border-indigo-100";
  return "bg-white text-gray-400 border-gray-100";
}

function getStatusIcon(type: string) {
  if (type === "INCOMING") return <span className="text-sm">📥</span>;
  if (type === "WELCOME") return <span className="text-sm">✨</span>;
  if (type === "REMINDER") return <span className="text-sm">🔁</span>;
  if (type === "MANUAL") return <span className="text-sm">🧑‍💻</span>;
  return <span className="text-sm">⚙️</span>;
}

function getIntentBadge(intent: string | null) {
  if (intent === "PRODUCT")
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
        🛒 Products
      </span>
    );
  if (intent === "BULK")
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
        📦 Bulk Deal
      </span>
    );
  if (intent === "STAFF")
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
        👤 Needs Staff
      </span>
    );
  return null;
}
