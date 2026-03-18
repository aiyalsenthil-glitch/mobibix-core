'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Search, 
  Send, 
  MoreVertical, 
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
  const [socket, setSocket] = useState<Socket | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost_REPLACED:3000';

  useEffect(() => {
    // WebSocket connects to the root, not the /api prefix
    const socketBase = API_URL.replace('/api', '');
    const s = io(`${socketBase}/inbox`, { 
      query: { tenantId },
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    s.on('connect', () => {
      console.log('Inbox WebSocket connected');
    });

    s.on('connect_error', (error) => {
      console.error('Inbox WebSocket connection error:', error);
    });

    s.on('inbox:new-message', (data: any) => {
      if (data.senderPhone === activeChat) {
        setMessages(prev => [...prev, {
          id: data.messageId,
          body: data.body,
          senderPhone: data.senderPhone,
          direction: 'INCOMING',
          timestamp: data.timestamp,
          status: 'READ'
        }]);
      }
      updateConversationList(data);
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [tenantId, activeChat]);

  const updateConversationList = (msg: any) => {
    setConversations(prev => {
      const existing = prev.find(c => c.phoneNumber === msg.senderPhone);
      if (existing) {
        return [
          { ...existing, lastMessage: msg.body, lastTimestamp: msg.timestamp, unreadCount: activeChat === msg.senderPhone ? 0 : existing.unreadCount + 1 },
          ...prev.filter(c => c.phoneNumber !== msg.senderPhone)
        ];
      }
      return [{ phoneNumber: msg.senderPhone, lastMessage: msg.body, lastTimestamp: msg.timestamp, unreadCount: 1 }, ...prev];
    });
  };

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
    <div className="flex h-[600px] w-full border rounded-2xl bg-white shadow-sm overflow-hidden font-sans">
      <div className="w-80 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b space-y-4">
          <h2 className="font-bold">Inbox</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="Search..." className="pl-9 bg-white" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {conversations.map((chat) => (
            <div
              key={chat.phoneNumber}
              onClick={() => setActiveChat(chat.phoneNumber)}
              className={`p-4 cursor-pointer transition-all ${activeChat === chat.phoneNumber ? 'bg-teal-50 border-l-4 border-teal-500' : 'hover:bg-gray-100'}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-sm">+{chat.phoneNumber}</span>
                <span className="text-[10px] text-gray-400">{new Date(chat.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs text-gray-500 truncate mt-1 italic">{chat.lastMessage}</p>
            </div>
          ))}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                 <Avatar className="h-10 w-10"><AvatarFallback className="bg-teal-100 text-teal-700">{activeChat[0]}</AvatarFallback></Avatar>
                 <div><h3 className="font-bold">+{activeChat}</h3><span className="text-[10px] text-green-500">Active</span></div>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
               <div className="flex justify-center mb-6"><Badge variant="outline" className="text-gray-400 text-[10px] px-3 py-1 uppercase"><ShieldCheck className="w-3 h-3 mr-1 text-teal-600" /> Secure Encryption</Badge></div>
               {messages.map((msg, idx) => (
                 <div key={msg.id || idx} className={`flex ${msg.direction === 'OUTGOING' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[80%] p-3 rounded-xl shadow-sm ${msg.direction === 'OUTGOING' ? 'bg-teal-600 text-white' : 'bg-white border'}`}>
                     <p className="text-xs">{msg.body}</p>
                     <div className="flex justify-end gap-1 mt-1 opacity-50"><span className="text-[9px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{msg.direction === 'OUTGOING' && (msg.status === 'READ' ? <CheckCheck className="w-3 h-3 text-teal-200" /> : <Check className="w-3 h-3" />)}</div>
                   </div>
                 </div>
               ))}
            </div>
            <div className="p-4 bg-white border-t">
              <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border">
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type..." className="border-none focus-visible:ring-0 bg-transparent" />
                <Button onClick={sendMessage} className="rounded-lg h-10 w-10 p-0 bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/20"><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
             <MessageSquare className="w-16 h-16 text-teal-100" />
             <h3 className="text-xl font-bold">Your Inbox</h3>
             <p className="text-gray-400 max-w-xs text-sm">Select a conversation to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
