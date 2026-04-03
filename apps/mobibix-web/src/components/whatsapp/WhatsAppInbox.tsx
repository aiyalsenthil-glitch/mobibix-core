'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  ShieldCheck,
  MessageSquare,
  Check,
  CheckCheck,
  Loader2,
  Image,
  Video,
  FileText,
  Mic,
  UserCheck,
  Bot,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, Avatar, AvatarFallback } from '@/components/ui/stubs';
import { authenticatedFetch, extractData } from '@/services/auth.api';
import {
  getInboxUnreadCount,
  markConversationRead,
  assignConversation,
  getConversationMeta,
} from '@/services/whatsapp.api';
import { listStaff } from '@/services/staff.api';

interface Message {
  id: string;
  body: string;
  senderPhone: string;
  direction: 'INCOMING' | 'OUTGOING';
  timestamp: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  localFile?: string;
}

interface Conversation {
  phoneNumber: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
}

export default function WhatsAppInbox({ tenantId }: { tenantId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [metaMap, setMetaMap] = useState<Record<string, { assignedToUserId: string | null; botPaused: boolean; assignedTo: { id: string; fullName: string | null } | null }>>({});
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [assigning, setAssigning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    fetchConversations();
    fetchUnread();
    fetchMeta();
    listStaff().then(s => setStaffList(s.filter(u => u.name).map(u => ({ id: u.id, name: u.name! }))));
    const interval = setInterval(() => { fetchConversations(); fetchUnread(); }, 15000);
    return () => clearInterval(interval);
  }, [tenantId]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat);
      markConversationRead(activeChat).catch(() => {});
      setUnreadMap(prev => ({ ...prev, [activeChat]: 0 }));
    }
  }, [activeChat, tenantId]);

  const fetchConversations = async () => {
    try {
      const resp = await authenticatedFetch(`/whatsapp/conversations/${tenantId}`);
      if (resp.ok) setConversations(await extractData(resp));
    } catch { /* silent */ }
  };

  const fetchUnread = async () => {
    try {
      const data = await getInboxUnreadCount();
      const map: Record<string, number> = {};
      data.conversations.forEach(c => { map[c.phoneNumber] = c.unread; });
      setUnreadMap(map);
    } catch { /* silent */ }
  };

  const fetchMeta = async () => {
    try {
      const data = await getConversationMeta();
      const map: Record<string, any> = {};
      data.forEach(m => { map[m.phoneNumber] = m; });
      setMetaMap(map);
    } catch { /* silent */ }
  };

  const fetchMessages = async (phone: string) => {
    try {
      const resp = await authenticatedFetch(`/whatsapp/messages/${tenantId}/${phone}`);
      if (resp.ok) {
        const data = await extractData(resp);
        setMessages(data.map((m: any) => ({
          id: m.id,
          body: m.body,
          senderPhone: m.direction === 'OUTGOING' ? 'me' : m.phoneNumber,
          direction: m.direction,
          timestamp: m.createdAt,
          status: m.status === 'RECEIVED' ? 'READ' : 'SENT',
          mediaType: m.metadata?.type && m.metadata.type !== 'text' && m.metadata.type !== 'interactive'
            ? m.metadata.type : undefined,
          localFile: m.metadata?.localFile || undefined,
        })));
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
      }
    } catch { /* silent */ }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || sending) return;
    const text = newMessage.trim();
    setSending(true);
    setNewMessage('');
    try {
      const resp = await authenticatedFetch(`/whatsapp/send`, {
        method: 'POST',
        body: JSON.stringify({ tenantId, phone: activeChat, text }),
      });
      if (!resp.ok) { setNewMessage(text); throw new Error('Send failed'); }
      const outgoingMsg: Message = {
        id: Date.now().toString(), body: text, senderPhone: 'me',
        direction: 'OUTGOING', timestamp: new Date().toISOString(), status: 'SENT',
      };
      setMessages(prev => [...prev, outgoingMsg]);
      setConversations(prev => {
        const existing = prev.find(c => c.phoneNumber === activeChat);
        if (!existing) return prev;
        return [{ ...existing, lastMessage: text, lastTimestamp: new Date().toISOString() }, ...prev.filter(c => c.phoneNumber !== activeChat)];
      });
    } catch { alert('Failed to send. Please try again.'); }
    finally { setSending(false); }
  };

  const handleAssign = async (userId: string | null) => {
    if (!activeChat) return;
    setAssigning(true);
    try {
      await assignConversation(activeChat, userId);
      const staff = userId ? staffList.find(s => s.id === userId) : null;
      setMetaMap(prev => ({
        ...prev,
        [activeChat]: {
          ...prev[activeChat],
          assignedToUserId: userId,
          assignedTo: staff ? { id: staff.id, fullName: staff.name } : null,
        },
      }));
    } catch { /* silent */ }
    finally { setAssigning(false); }
  };

  const activeMeta = activeChat ? metaMap[activeChat] : null;

  return (
    <div className="flex [height:calc(100vh-280px)] min-h-[500px] w-full border border-border rounded-3xl bg-card shadow-xl shadow-black/5 overflow-hidden font-sans transition-colors duration-200">
      <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-4 border-b border-border space-y-4">
          <h2 className="font-black text-foreground uppercase tracking-wider text-xs">Inbox</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9 bg-background border-none shadow-inner" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {conversations.map((chat) => {
            const unread = unreadMap[chat.phoneNumber] || 0;
            const meta = metaMap[chat.phoneNumber];
            return (
              <div
                key={chat.phoneNumber}
                onClick={() => setActiveChat(chat.phoneNumber)}
                className={`p-4 cursor-pointer transition-all border-l-4 ${activeChat === chat.phoneNumber ? 'bg-teal-500/10 border-teal-500 dark:bg-teal-500/20' : 'border-transparent hover:bg-muted/50'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-black text-sm text-foreground">+{chat.phoneNumber}</span>
                  <div className="flex items-center gap-1.5">
                    {unread > 0 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-teal-500 text-white text-[9px] font-bold">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {new Date(chat.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-1 italic leading-tight">{chat.lastMessage}</p>
                {meta?.assignedTo?.fullName && (
                  <span className="text-[10px] text-blue-500 font-semibold flex items-center gap-0.5 mt-0.5">
                    <UserCheck className="w-2.5 h-2.5" /> {meta.assignedTo.fullName}
                  </span>
                )}
              </div>
            );
          })}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            <div className="p-5 border-b border-border flex justify-between items-center bg-card/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-3">
                 <Avatar className="h-10 w-10 border-2 border-teal-100 dark:border-teal-900 shadow-sm">
                   <AvatarFallback className="bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold">
                     {activeChat[0]}
                   </AvatarFallback>
                 </Avatar>
                 <div>
                   <h3 className="font-black text-foreground">+{activeChat}</h3>
                   <div className="flex items-center gap-2 mt-0.5">
                     <span className="flex items-center gap-1 text-[10px] text-teal-500 font-bold uppercase tracking-wider">
                       <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" /> Connected
                     </span>
                     {activeMeta?.botPaused && (
                       <span className="text-[10px] text-orange-500 font-bold flex items-center gap-0.5">
                         <Bot className="w-2.5 h-2.5" /> Bot Paused
                       </span>
                     )}
                   </div>
                 </div>
              </div>
              {/* Assignment dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={activeMeta?.assignedToUserId || ''}
                  onChange={e => handleAssign(e.target.value || null)}
                  disabled={assigning}
                  className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 font-medium text-foreground disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">Unassigned</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-muted/5 relative">
               <div className="flex justify-center mb-8 sticky top-0 z-10">
                 <Badge variant="outline" className="bg-background/80 backdrop-blur-md border-border text-muted-foreground text-[9px] px-4 py-1.5 rounded-full uppercase font-bold tracking-widest">
                   <ShieldCheck className="w-3 h-3 mr-1.5 text-teal-500" /> End-to-End Encrypted
                 </Badge>
               </div>
               {messages.map((msg, idx) => (
                 <div key={msg.id || idx} className={`flex ${msg.direction === 'OUTGOING' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] shadow-sm overflow-hidden ${msg.direction === 'OUTGOING' ? 'bg-teal-600 text-white rounded-2xl rounded-tr-none shadow-lg shadow-teal-500/10' : 'bg-card border border-border text-foreground rounded-2xl rounded-tl-none'}`}>
                     <MessageContent msg={msg} tenantId={tenantId} apiUrl={process.env.NEXT_PUBLIC_API_URL || ''} />
                     <div className={`flex justify-end items-center gap-1 px-4 pb-2 ${msg.direction === 'OUTGOING' ? 'text-teal-50/50' : 'text-muted-foreground/50'}`}>
                       <span className="text-[8px] font-medium tracking-tighter uppercase">
                         {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                       {msg.direction === 'OUTGOING' && (msg.status === 'READ' ? <CheckCheck className="w-3 h-3 text-teal-200" /> : <Check className="w-3 h-3" />)}
                     </div>
                   </div>
                 </div>
               ))}
            </div>
            <div className="p-5 bg-card/50 backdrop-blur-md border-t border-border">
              <div className="flex gap-2 items-center bg-muted/50 p-1.5 px-3 rounded-2xl border border-border transition-all focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500/50">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="border-none focus-visible:ring-0 bg-transparent text-sm disabled:opacity-60"
                />
                <Button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="rounded-xl h-10 w-10 p-0 bg-teal-600 hover:bg-teal-500 shadow-xl shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
             <div className="p-8 rounded-full bg-teal-500/5">
               <MessageSquare className="w-16 h-16 text-teal-500/20" />
             </div>
             <div className="space-y-2">
               <h3 className="text-2xl font-black text-foreground">Conversations</h3>
               <p className="text-muted-foreground max-w-xs text-sm font-medium">
                 Synced in real-time with Meta Cloud API. Select a thread to continue.
               </p>
             </div>
          </div>
        )}
      </div>
    </div>

  );
}

// ── Media-aware message bubble content ──────────────────────────────────────
function MessageContent({ msg, tenantId, apiUrl }: { msg: Message; tenantId: string; apiUrl: string }) {
  const mediaUrl = msg.localFile
    ? `${apiUrl}/whatsapp/media/${msg.localFile}`
    : null;

  if (msg.mediaType === 'image' || msg.mediaType === 'sticker') {
    return mediaUrl ? (
      <div className="p-1">
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={mediaUrl}
            alt="image"
            className="max-w-[260px] max-h-[200px] rounded-xl object-cover block"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </a>
        {msg.body && <p className="text-xs px-3 pt-2">{msg.body}</p>}
      </div>
    ) : (
      <div className="flex items-center gap-2 px-4 py-3 opacity-60">
        <Image className="w-4 h-4" />
        <span className="text-xs">Image (downloading…)</span>
      </div>
    );
  }

  if (msg.mediaType === 'video') {
    return mediaUrl ? (
      <div className="p-1">
        <video
          src={mediaUrl}
          controls
          className="max-w-[260px] max-h-[200px] rounded-xl block"
        />
        {msg.body && <p className="text-xs px-3 pt-2">{msg.body}</p>}
      </div>
    ) : (
      <div className="flex items-center gap-2 px-4 py-3 opacity-60">
        <Video className="w-4 h-4" />
        <span className="text-xs">Video (downloading…)</span>
      </div>
    );
  }

  if (msg.mediaType === 'audio') {
    return mediaUrl ? (
      <div className="px-3 py-2">
        <audio src={mediaUrl} controls className="h-8 w-[220px]" />
      </div>
    ) : (
      <div className="flex items-center gap-2 px-4 py-3 opacity-60">
        <Mic className="w-4 h-4" />
        <span className="text-xs">Voice message (downloading…)</span>
      </div>
    );
  }

  if (msg.mediaType === 'document') {
    const filename = msg.localFile?.split('/').pop() || 'document';
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <FileText className="w-8 h-8 opacity-70 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate max-w-[180px]">{filename}</p>
          {mediaUrl && (
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] underline opacity-70">
              Download
            </a>
          )}
        </div>
      </div>
    );
  }

  // Plain text
  return <p className="text-xs px-4 pt-3 pb-1">{msg.body}</p>;
}
