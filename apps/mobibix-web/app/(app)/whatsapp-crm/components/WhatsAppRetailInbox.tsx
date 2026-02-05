import { useEffect, useState, useRef } from "react";
import { getWhatsAppLogs, WhatsAppLog, sendWhatsAppMessage } from "@/services/whatsapp.api";

type InboxProps = {
  tenantId?: string;
};

export default function WhatsAppRetailInbox({ tenantId }: InboxProps) {
  const [conversations, setConversations] = useState<Record<string, WhatsAppLog[]>>({});
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Logs
  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 10000); // Poll every 10s for demo
    return () => clearInterval(interval);
  }, []);

  async function loadLogs() {
    try {
      const logs = await getWhatsAppLogs();
      // Group by phone
      const grouped: Record<string, WhatsAppLog[]> = {};
      logs.forEach((log) => {
        const phone = log.phone;
        if (!grouped[phone]) grouped[phone] = [];
        grouped[phone].push(log);
      });
      // Sort logs within groups (oldest to newest)
      Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      });
      setConversations(grouped);
      
      // Auto-select first if none selected
      if (!selectedPhone && Object.keys(grouped).length > 0) {
        const sortedPhones = Object.keys(grouped).sort((a, b) => {
          const lastA = grouped[a][grouped[a].length - 1];
          const lastB = grouped[b][grouped[b].length - 1];
          return new Date(lastB.sentAt).getTime() - new Date(lastA.sentAt).getTime();
        });
        setSelectedPhone(sortedPhones[0]);
      }
    } catch (err) {
      console.error("Failed to load WhatsApp logs", err);
    }
  }

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedPhone, conversations]);

  async function handleSend() {
    if (!selectedPhone || !replyText.trim()) return;
    setSending(true);
    try {
      // For demo, we use 'bot_text_response' to simulate a generic message if no specific staff template exists
      await sendWhatsAppMessage({
        phone: selectedPhone,
        templateId: "bot_text_response", 
        parameters: [replyText]
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
      <div className="border-r border-gray-200 flex flex-col bg-white h-full overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 backdrop-blur">
          <h2 className="font-semibold text-gray-800">Active Conversations</h2>
          <p className="text-xs text-gray-500 mt-1">{sortedPhones.length} customers active</p>
        </div>
        <div className="overflow-y-auto flex-1">
          {sortedPhones.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-4xl mb-3 opacity-20">👥</div>
              <p className="text-sm">Select a conversation to view activity</p>
            </div>
          ) : (
            sortedPhones.map(phone => {
              const logs = conversations[phone];
              const lastLog = logs[logs.length - 1];
              const isSelected = phone === selectedPhone;
              const isStaff = lastLog.type === 'MANUAL';
              
              return (
                <div 
                  key={phone}
                  onClick={() => setSelectedPhone(phone)}
                  className={`p-4 border-b border-gray-50 cursor-pointer transition-all duration-200 ${
                    isSelected ? 'bg-teal-50/50 border-teal-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-medium ${isSelected ? 'text-teal-900' : 'text-gray-900'}`}>
                      {phone}
                    </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-500">
                           {new Date(lastLog.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       </div>
                    
                    <div className="flex items-center justify-between gap-2">
                       <p className="text-xs text-gray-500 truncate flex-1 leading-snug">
                         {getLogDescription(lastLog)}
                       </p>
                       {/* INTENT BADGE */}
                       {getIntentBadge(deriveCustomerIntent(logs))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
  
        {/* RIGHT: Timeline View */}
        <div className="lg:col-span-2 flex flex-col bg-gray-50/30 h-full overflow-hidden">
          {!selectedPhone ? (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
               <div className="text-6xl mb-4 opacity-10">💬</div>
               <p className="font-medium text-gray-500">Select a conversation to manage retail automation</p>
             </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10 sticky top-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold shadow-sm">
                     {selectedPhone.slice(-2)}
                   </div>
                   <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">{selectedPhone}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Active Session
                      </p>
                   </div>
                </div>
                <div className="flex gap-2">
                   {getIntentBadge(deriveCustomerIntent(activeLogs))}
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
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-gray-50 shadow-sm z-0 ${getStatusColor(log.type)}`}>
                         {getStatusIcon(log.type)}
                      </div>
                      
                      {/* Card */}
                      <div className="flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                             {getLogTitle(log.type)}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              {deriveCustomerIntent(activeLogs) === 'STAFF' && activeLogs[activeLogs.length - 1].type !== 'MANUAL' && (
                  <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-3 animate-pulse">
                      <span className="text-amber-500 text-lg">⚠️</span>
                      <p className="text-xs font-bold text-amber-800">
                          ACTION REQUIRED: Customer requested staff handover. Automation paused.
                      </p>
                  </div>
              )}
  
              {/* Reply Input */}
              <div className="p-4 bg-white border-t border-gray-200">
                 <div className="relative shadow-sm rounded-xl overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-shadow">
                   <textarea
                     className="w-full pl-4 pr-14 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
                     rows={2}
                     placeholder="Type a manual reply to take over..."
                     value={replyText}
                     onChange={e => setReplyText(e.target.value)}
                     onKeyDown={e => {
                       if(e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault();
                         handleSend();
                       }
                     }}
                   />
                   <button 
                    onClick={handleSend}
                    disabled={sending || !replyText.trim()}
                    className="absolute right-2 bottom-2 p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 transition-all shadow-sm"
                   >
                     {sending ? (
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     ) : (
                       <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                     )}
                   </button>
                 </div>
                 <div className="mt-2 flex justify-between items-center">
                    <span className="text-[10px] text-gray-400">Staff replies will stop automation for 24 hours.</span>
                    <span className="text-[10px] text-gray-400">Enter to send</span>
                 </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

// --- Helpers ---

// --- Helpers & Logic ---

function deriveCustomerIntent(logs: WhatsAppLog[]): 'PRODUCT' | 'BULK' | 'STAFF' | null {
  // Scan recent logs (newest last)
  // We look for the *latest* relevant incoming message
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    if (log.type === 'INCOMING') {
      const text = getMessageBody(log)?.toLowerCase() || '';
      
      if (text === '1' || text.includes('product') || text.includes('stock')) return 'PRODUCT';
      if (text === '2' || text.includes('bulk') || text.includes('wholesale')) return 'BULK';
      if (text === '3' || text.includes('staff') || text.includes('human')) return 'STAFF';
    }
  }
  return null;
}

function getMessageBody(log: WhatsAppLog): string | null {
  if (!log.metadata) return null;
  // Handle Text
  if (log.metadata.type === 'text' && log.metadata.text) return log.metadata.text.body;
  // Handle Interactive (Simple)
  if (log.metadata.type === 'interactive') {
     const interactive = log.metadata.interactive;
     if (interactive.button_reply) return interactive.button_reply.id;
     if (interactive.list_reply) return interactive.list_reply.id;
  }
  return null;
}

function getLogTitle(log: WhatsAppLog) {
  if (log.type === 'INCOMING') return '👤 Customer Action';
  if (log.type === 'WELCOME') return '🤖 Automated Greeting';
  if (log.type === 'REMINDER') return '⏰ Automation Triggered';
  if (log.type === 'MANUAL') return '📤 Staff Replied';
  return '⚙️ System Message';
}

function getLogDescription(log: WhatsAppLog) {
  // Incoming (User Reply)
  if (log.type === 'INCOMING') {
    const text = getMessageBody(log);
    if (!text) return 'Sent a message';
    
    // Semantic mapping for Demo
    if (text === '1' || text.includes('product')) return 'Selected: Product Enquiry';
    if (text === '2' || text.includes('bulk')) return 'Selected: Bulk Order Enquiry';
    if (text === '3' || text.includes('staff')) return 'Requested: Staff Handover';
    
    return `Customer replied: "${text}"`;
  }

  // Outgoing (System/Staff)
  if (log.metadata && log.metadata['parameters']) {
     const params = log.metadata['parameters'] as string[];
     return `Sent template with params: ${params.join(', ')}`;
  }
  if (log.metadata && log.metadata['text_snippet']) {
     return `Sent: "${log.metadata['text_snippet']}..."`;
  }
  
  if (log.type === 'WELCOME') return "Sent welcome menu & options";
  if (log.type === 'MANUAL') return "Staff sent a manual message";
  if (log.type === 'REMINDER') return "Reminder template sent";
  
  return `Sent ${log.type?.toLowerCase().replace('_', ' ')} template`;
}

function getStatusColor(type: string) {
  if (type === 'INCOMING') return 'bg-blue-50 text-blue-600 border-blue-100';
  if (type === 'WELCOME') return 'bg-teal-50 text-teal-600 border-teal-100';
  if (type === 'REMINDER') return 'bg-orange-50 text-orange-600 border-orange-100';
  if (type === 'MANUAL') return 'bg-indigo-50 text-indigo-600 border-indigo-100';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

function getStatusIcon(type: string) {
  if (type === 'INCOMING') return <span className="text-lg">💬</span>;
  if (type === 'WELCOME') return <span className="text-lg">👋</span>;
  if (type === 'REMINDER') return <span className="text-lg">⏰</span>;
  if (type === 'MANUAL') return <span className="text-lg">👤</span>;
  return <span className="text-lg">⚙️</span>;
}

function getIntentBadge(intent: string | null) {
  if (intent === 'PRODUCT') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">🛒 Products</span>;
  if (intent === 'BULK') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">📦 Bulk Deal</span>;
  if (intent === 'STAFF') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">👤 Needs Staff</span>;
  return null;
}
