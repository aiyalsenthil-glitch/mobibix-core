'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  ShieldCheck,
  MessageSquare,
  Check,
  CheckCheck
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
  status: 'SENT' | 'DELIVERED' | 'READ';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    fetchConversations();
    // Poll every 15 seconds as fallback for WebSocket gaps
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [tenantId]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat);
    }
  }, [activeChat, tenantId]);

  const fetchConversations = async () => {
    try {
      const resp = await authenticatedFetch(`/whatsapp/conversations/${tenantId}`);
      if (resp.ok) {
        setConversations(await extractData(resp));
      }
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
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
          status: m.status === 'RECEIVED' ? 'READ' : 'SENT'
        })));
        
        // Minor delay to ensure items are rendered before scrolling
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    try {
      const resp = await authenticatedFetch(`/whatsapp/send`, { 
        method: 'POST',
        body: JSON.stringify({ 
          tenantId, 
          phone: activeChat, 
          text: newMessage 
        })
      });
      
      if (!resp.ok) throw new Error('Send failed');

      const outgoingMsg: Message = {
        id: Date.now().toString(),
        body: newMessage,
        senderPhone: 'me',
        direction: 'OUTGOING',
        timestamp: new Date().toISOString(),
        status: 'SENT'
      };
      
      setMessages(prev => [...prev, outgoingMsg]);
      setNewMessage('');
      
      // Update local conversation list snippet
      setConversations(prev => {
        const existing = prev.find(c => c.phoneNumber === activeChat);
        if (existing) {
          return [
            { ...existing, lastMessage: newMessage, lastTimestamp: new Date().toISOString() },
            ...prev.filter(c => c.phoneNumber !== activeChat)
          ];
        }
        return prev;
      });
    } catch (err) {
      alert('Failed to send');
    }
  };

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
          {conversations.map((chat) => (
            <div
              key={chat.phoneNumber}
              onClick={() => setActiveChat(chat.phoneNumber)}
              className={`p-4 cursor-pointer transition-all border-l-4 ${activeChat === chat.phoneNumber ? 'bg-teal-500/10 border-teal-500 dark:bg-teal-500/20' : 'border-transparent hover:bg-muted/50'}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-black text-sm text-foreground">+{chat.phoneNumber}</span>
                <span className="text-[10px] text-muted-foreground font-medium">{new Date(chat.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate mt-1 italic leading-tight">{chat.lastMessage}</p>
            </div>
          ))}
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
                   <span className="flex items-center gap-1 text-[10px] text-teal-500 font-bold uppercase tracking-wider">
                     <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" /> Connected
                   </span>
                 </div>
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
                   <div className={`max-w-[85%] px-4 py-3 shadow-sm ${msg.direction === 'OUTGOING' ? 'bg-teal-600 text-white rounded-2xl rounded-tr-none shadow-lg shadow-teal-500/10' : 'bg-card border border-border text-foreground rounded-2xl rounded-tl-none'}`}>
                     <p className="text-xs">{msg.body}</p>
                     <div className={`flex justify-end items-center gap-1 mt-1.5 ${msg.direction === 'OUTGOING' ? 'text-teal-50/50' : 'text-muted-foreground/50'}`}>
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
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="border-none focus-visible:ring-0 bg-transparent text-sm" />
                <Button onClick={sendMessage} className="rounded-xl h-10 w-10 p-0 bg-teal-600 hover:bg-teal-500 shadow-xl shadow-teal-500/20 active:scale-95 transition-all">
                  <Send className="w-4 h-4" />
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
