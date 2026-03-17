'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Search, 
  Send, 
  MoreVertical, 
  ShieldCheck,
  User,
  Check,
  CheckCheck,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, Avatar, AvatarFallback } from '@/components/ui/stubs';
import { authenticatedFetch, extractData } from '@/services/auth.api';

interface Message {
  id: string;
  body: string;
  senderPhone: string;
  direction: 'INCOMING' | 'OUTGOING';
  timestamp: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'RECEIVED';
}

interface Conversation {
  phoneNumber: string; // This holds the ID (phone or JID part)
  pushName?: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
}

export default function WhatsAppInbox({ tenantId }: { tenantId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [syncInfo, setSyncInfo] = useState<{ status: string, progress: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost_REPLACED:3000';

  // Robust formatting for phone/JID
  const formatIdentifier = (id: string, pushName?: string) => {
    if (!id) return 'Unknown';
    if (pushName) return pushName;

    const lowerId = id.toLowerCase();
    if (lowerId.includes('status') || lowerId.includes('broadcast')) return 'System';

    // Extract identifier part (strip @s.whatsapp.net, etc.)
    const parts = id.split('@');
    const cleanId = parts[0].trim();
    const suffix = parts[1] || '';

    // If it is a group
    if (suffix === 'g.us' || id.includes('-') || cleanId.length > 15) {
      if (suffix === 'g.us') return `Group: ${cleanId.slice(-4)}`;
      if (suffix === 'lid') return `User: ${cleanId.slice(-4)}`;
    }

    const numericId = cleanId.replace(/[^\d]/g, ''); 
    // If it's a standard phone number (10-15 digits)
    if (numericId.length >= 10 && numericId.length <= 15) {
      return cleanId.startsWith('+') ? cleanId : `+${cleanId}`;
    }

    return cleanId;
  };

  const fetchConversations = useCallback(async () => {
    if (!tenantId) return;
    console.log("🔍 Fetching conversations for tenant:", tenantId);
    setLoading(true);
    try {
      const response = await authenticatedFetch(`/whatsapp/conversations/${tenantId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await extractData(response);
      console.log("✅ Fetched raw conversations:", data?.length || 0);
      
      const filtered = (data || []).filter((chat: any) => 
        !chat.phoneNumber.toLowerCase().includes('status') && 
        !chat.phoneNumber.toLowerCase().includes('broadcast') &&
        !chat.phoneNumber.toLowerCase().includes('@g.us') &&
        !chat.phoneNumber.toLowerCase().includes('@newsletter')
      );
      
      console.log("✅ After filtering:", filtered.length);
      if (data?.length > 0 && filtered.length === 0) {
        console.warn("⚠️ All conversations were filtered out!");
      }
      setConversations(filtered);
      if (filtered.length > 0 && !activeChat) {
        console.log("🎯 Auto-selecting first conversation:", filtered[0].phoneNumber);
        setActiveChat(filtered[0].phoneNumber);
      }
    } catch (err) {
      console.error("❌ Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      console.warn("⚠️ WhatsAppInbox mounted without tenantId");
      return;
    }
    console.log("🚀 WhatsAppInbox initialized for tenant:", tenantId);
    fetchConversations();
  }, [tenantId, fetchConversations]);

  const fetchMessages = useCallback(async () => {
    if (!activeChat) return;
    console.log("🔍 Fetching messages for chat:", activeChat);
    setMessagesLoading(true);
    try {
      const response = await authenticatedFetch(`/whatsapp/messages/${tenantId}/${activeChat}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await extractData(response);
      console.log("✅ Fetched messages:", data?.length || 0);
      setMessages((data || []).map((m: any) => ({
        ...m,
        timestamp: m.createdAt,
        direction: m.direction as any
      })));
    } catch (err) {
      console.error("❌ Failed to fetch messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  }, [tenantId, activeChat]);

  const triggerSync = async () => {
    if (!tenantId || !activeChat || syncing) return;
    setSyncing(true);
    try {
      await authenticatedFetch(`/whatsapp/sync/${tenantId}/${activeChat}`, { method: 'POST' });
      // Give it a few seconds to sync then refresh
      setTimeout(() => fetchMessages(), 4000);
    } catch (err) {
      console.error("❌ Sync failed:", err);
    } finally {
      setTimeout(() => setSyncing(false), 6000);
    }
  };

  useEffect(() => {
    if (activeChat) {
      fetchMessages();
    }
  }, [activeChat, fetchMessages]);

  useEffect(() => {
    console.log('Connecting to Inbox WebSocket at:', `${API_URL}/inbox`);
    const s = io(`${API_URL}/inbox`, { 
      query: { tenantId },
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => console.log('✅ Inbox WebSocket connected'));
    s.on('connect_error', (err) => console.error('❌ Inbox WebSocket error:', err.message));

    s.on('inbox:new-message', (data: any) => {
      console.log('New message received via WS:', data);
      
      if (data.syncStatus) {
        setSyncInfo({ status: data.syncStatus, progress: data.progress || 0 });
        if (data.syncStatus === 'COMPLETED') {
           setTimeout(() => {
             setSyncInfo(null);
             fetchConversations();
           }, 2000);
        }
        return;
      }

      const isValid = (phone: string) => /^\d+$/.test(phone) && phone.length >= 8 && phone.length <= 14;

      if (!isValid(data.phoneNumber)) {
        console.warn('⚠️ Skipping invalid phone data from WS:', data.phoneNumber);
        return;
      }

      if (data.phoneNumber === activeChat) {
        setMessages(prev => [...prev, {
          id: data.messageId,
          body: data.body,
          senderPhone: data.phoneNumber,
          direction: 'INCOMING',
          timestamp: data.timestamp || new Date().toISOString(),
          status: 'RECEIVED'
        }]);
      }
      updateConversationList(data);
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [tenantId, activeChat]);

  const updateConversationList = (msg: any) => {
    setConversations(prev => {
      const convId = msg.phoneNumber || msg.senderPhone || msg.jid;
      if (!convId) return prev;
      
      const existing = prev.find(c => c.phoneNumber === convId);
      if (existing) {
        return [
          { 
            ...existing, 
            lastMessage: msg.body, 
            lastTimestamp: msg.timestamp || new Date().toISOString(), 
            unreadCount: activeChat === convId ? 0 : (existing.unreadCount || 0) + 1,
            pushName: msg.pushName || existing.pushName
          },
          ...prev.filter(c => c.phoneNumber !== convId)
        ];
      }
      return [{ 
        phoneNumber: convId, 
        pushName: msg.pushName,
        lastMessage: msg.body, 
        lastTimestamp: msg.timestamp || new Date().toISOString(), 
        unreadCount: activeChat === convId ? 0 : 1 
      }, ...prev];
    });
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    try {
      const response = await authenticatedFetch(`/whatsapp/send`, { 
        method: 'POST',
        body: JSON.stringify({
          tenantId, 
          phone: activeChat, 
          text: newMessage 
        })
      });
      if (!response.ok) throw new Error("Failed to send");

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        body: newMessage,
        senderPhone: 'me',
        direction: 'OUTGOING',
        timestamp: new Date().toISOString(),
        status: 'SENT'
      }]);
      setNewMessage('');
    } catch (err) {
      alert('Failed to send');
    }
  };

  return (
    <div className="flex h-[600px] w-full border rounded-2xl bg-white shadow-sm overflow-hidden font-sans">
      <div className="w-80 border-r bg-gray-50/50 flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Conversations</h2>
            {syncInfo ? (
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-teal-600 font-bold animate-pulse">Syncing History</span>
                <span className="text-[9px] text-gray-400">{syncInfo.progress}%</span>
              </div>
            ) : loading ? (
              <span className="text-[10px] text-teal-600 animate-pulse font-medium">Loading...</span>
            ) : null}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="Search..." className="pl-9 h-9 rounded-lg bg-white border-gray-200" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loading ? (
             <div className="p-8 space-y-4">
               {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
             </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic text-sm">No active chats</div>
          ) : (
            conversations
              .filter(chat => !chat.phoneNumber.toLowerCase().includes('status') && !chat.phoneNumber.toLowerCase().includes('broadcast'))
              .map((chat) => (
              <div
                key={chat.phoneNumber}
                onClick={() => setActiveChat(chat.phoneNumber)}
                className={`p-4 cursor-pointer transition-all border-b border-gray-50 ${activeChat === chat.phoneNumber ? 'bg-white border-l-4 border-teal-500' : 'hover:bg-gray-100/50'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-gray-700 truncate max-w-[150px]">
                    {formatIdentifier(chat.phoneNumber, chat.pushName)}
                  </span>
                  <span className="text-[10px] text-gray-400">{new Date(chat.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-1 italic">{chat.lastMessage}</p>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {activeChat ? (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-white/80 backdrop-blur sticky top-0 z-10">
              <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold uppercase">
                     {formatIdentifier(activeChat, conversations.find(c => c.phoneNumber === activeChat)?.pushName)[0]}
                   </div>
                   <div>
                     <h3 className="font-bold text-gray-900 leading-none">
                       {formatIdentifier(activeChat, conversations.find(c => c.phoneNumber === activeChat)?.pushName)}
                     </h3>
                     <span className="text-[10px] text-green-500 font-bold">● Active now</span>
                   </div>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
               <div className="flex justify-center mb-6"><Badge variant="outline" className="bg-white/80 text-gray-500 text-[10px] px-3 py-0.5 uppercase tracking-wider"><ShieldCheck className="w-3 h-3 mr-1 text-teal-600" /> Secure Encryption</Badge></div>
               {messagesLoading ? (
                 <div className="flex justify-center items-center h-full">
                   <Loader2 className="w-8 h-8 animate-spin text-teal-500 opacity-50" />
                 </div>
               ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="p-4 bg-teal-50 rounded-full text-teal-600">
                    <RefreshCw className={`w-8 h-8 ${syncing ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-900 font-medium">No messages yet</p>
                    <p className="text-gray-500 text-xs px-8">We haven't recorded history for this chat yet.</p>
                  </div>
                  <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={triggerSync}
                   disabled={syncing}
                   className="mt-2 border-teal-200 text-teal-700 hover:bg-teal-50"
                 >
                   {syncing ? 'Syncing...' : 'Sync History'}
                 </Button>
                </div>
               ) : (
                <>
                  <div className="flex justify-center p-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] text-gray-400 hover:text-teal-600 h-6"
                      onClick={triggerSync}
                      disabled={syncing}
                    >
                      {syncing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                      Fetch older messages
                    </Button>
                  </div>
                  {messages.map((msg, idx) => (
                    <div key={msg.id || idx} className={`flex ${msg.direction === 'OUTGOING' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] p-3 rounded-xl shadow-sm ${msg.direction === 'OUTGOING' ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-white border text-gray-800 rounded-tl-none'}`}>
                        <p className="text-[13px] leading-relaxed">{msg.body}</p>
                        <div className="flex justify-end gap-1 mt-1 opacity-60"><span className="text-[9px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{msg.direction === 'OUTGOING' && (msg.status === 'READ' ? <CheckCheck className="w-3 h-3 text-white" /> : <Check className="w-3 h-3" />)}</div>
                      </div>
                    </div>
                  ))}
                </>
               )}
            </div>
            <div className="p-4 bg-white border-t">
              <div className="flex gap-2 items-center bg-gray-50 p-1.5 rounded-xl border">
                <Input 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && activeChat !== 'status' && sendMessage()} 
                  placeholder={activeChat === 'status' ? "Cannot reply to status updates" : "Type message..."} 
                  disabled={activeChat === 'status'}
                  className="border-none focus-visible:ring-0 bg-transparent h-10" 
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={activeChat === 'status' || !newMessage.trim()}
                  className="rounded-lg h-10 w-10 p-0 bg-teal-600 hover:bg-teal-700 shadow-sm transition-opacity disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-teal-100 shadow-inner">
               <MessageSquare className="w-10 h-10" />
             </div>
             <h3 className="text-xl font-bold text-gray-900">Retail Automation Inbox</h3>
             <p className="text-gray-500 max-w-xs text-sm">Select a customer thread to monitor automated engagement or intervene manually.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { MessageSquare } from 'lucide-react';
