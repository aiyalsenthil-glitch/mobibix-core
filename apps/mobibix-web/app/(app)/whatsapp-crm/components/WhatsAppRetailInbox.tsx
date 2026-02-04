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
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                      {new Date(lastLog.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                     <p className="text-xs text-gray-500 truncate max-w-[140px]">
                       {getLogDescription(lastLog)}
                     </p>
                     <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                       isStaff ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                     }`}>
                       {isStaff ? 'Staff replied' : 'Automated'}
                     </span>
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
             <p className="font-medium text-gray-500">Customer conversations will appear here when WhatsApp automation runs</p>
             <p className="text-sm mt-2">No active conversation selected</p>
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
                      WhatsApp Active
                    </p>
                 </div>
              </div>
              <div className="flex gap-2">
                 <span className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 text-xs rounded-lg font-medium shadow-sm">
                   Retail Customer
                 </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50">
               <div className="flex justify-center">
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
                   Interaction Timeline (Demo View)
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
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {getLogDescription(log)}
                      </p>
                    </div>
                 </div>
               ))}
               <div ref={messagesEndRef} />
               
               <div className="py-4 text-center">
                 <p className="text-xs text-gray-400">
                   Customer interactions will appear here as WhatsApp automation and replies occur.
                 </p>
               </div>
            </div>

            {/* Reply Input */}
            <div className="p-4 bg-white border-t border-gray-200">
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reply to customer</label>
               <div className="relative shadow-sm rounded-xl overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-shadow">
                 <textarea
                   className="w-full pl-4 pr-14 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
                   rows={2}
                   placeholder="Type a staff reply..."
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
                  title="Send Reply"
                 >
                   {sending ? (
                     <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   ) : (
                     <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                   )}
                 </button>
               </div>
               <div className="mt-2 flex justify-end">
                  <span className="text-[10px] text-gray-400">Press Enter to send</span>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Helpers ---

function getLogTitle(type: string) {
  if (type === 'WELCOME') return '🤖 Automated Greeting';
  if (type === 'REMINDER') return '⏰ Automation Triggered';
  if (type === 'MANUAL') return '📤 Staff Replied';
  return '🤖 System Message';
}

function getLogDescription(log: WhatsAppLog) {
  if (log.metadata && log.metadata['parameters']) {
     const params = log.metadata['parameters'] as string[];
     return params.join(' ');
  }
  if (log.type === 'WELCOME') return "Sent welcome menu & options";
  if (log.type === 'MANUAL') return "Staff sent a manual message via dashboard";
  if (log.type === 'REMINDER') return "Reminder template sent";
  return `Sent ${log.type?.toLowerCase().replace('_', ' ')} template`;
}

function getStatusColor(type: string) {
  if (type === 'WELCOME') return 'bg-teal-50 text-teal-600 border-teal-100';
  if (type === 'REMINDER') return 'bg-orange-50 text-orange-600 border-orange-100';
  if (type === 'MANUAL') return 'bg-indigo-50 text-indigo-600 border-indigo-100';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

function getStatusIcon(type: string) {
  if (type === 'WELCOME') return <span className="text-lg">👋</span>;
  if (type === 'REMINDER') return <span className="text-lg">⏰</span>;
  if (type === 'MANUAL') return <span className="text-lg">👤</span>;
  return <span className="text-lg">⚙️</span>;
}
