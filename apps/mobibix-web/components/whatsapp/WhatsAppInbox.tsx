'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Search, 
  Send, 
  MoreVertical, 
  ShieldCheck,
  User,
  Check,
  CheckCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, Avatar, AvatarFallback } from '@/components/ui/stubs';
import axios from 'axios';

interface Message {
  id: string;
  body: string;
  senderPhone: string;
  direction: 'INCOMING' | 'OUTGOING';
  timestamp: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost_REPLACED:3000';

  useEffect(() => {
    const s = io(`${API_URL}/inbox`, { query: { tenantId } });

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
          { 
            ...existing, 
            lastMessage: msg.body, 
            lastTimestamp: msg.timestamp, 
            unreadCount: activeChat === msg.senderPhone ? 0 : existing.unreadCount + 1,
            pushName: msg.pushName || existing.pushName
          },
          ...prev.filter(c => c.phoneNumber !== msg.senderPhone)
        ];
      }
      return [{ 
        phoneNumber: msg.senderPhone, 
        pushName: msg.pushName,
        lastMessage: msg.body, 
        lastTimestamp: msg.timestamp, 
        unreadCount: activeChat === msg.senderPhone ? 0 : 1 
      }, ...prev];
    });
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    try {
      await axios.post(`${API_URL}/whatsapp/send`, { tenantId, phoneNumber: activeChat, body: newMessage });
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
          <h2 className="font-bold text-gray-800">Conversations</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="Search..." className="pl-9 h-9 rounded-lg bg-white border-gray-200" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic text-sm">No active chats</div>
          ) : (
            conversations.map((chat) => (
              <div
                key={chat.phoneNumber}
                onClick={() => setActiveChat(chat.phoneNumber)}
                className={`p-4 cursor-pointer transition-all border-b border-gray-50 ${activeChat === chat.phoneNumber ? 'bg-white border-l-4 border-teal-500' : 'hover:bg-gray-100/50'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-gray-700 truncate max-w-[150px]">
                    {chat.pushName || (chat.phoneNumber.length > 15 ? chat.phoneNumber : `+${chat.phoneNumber}`)}
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
                   {conversations.find(c => c.phoneNumber === activeChat)?.pushName?.[0] || activeChat[0]}
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-900 leading-none">
                     {conversations.find(c => c.phoneNumber === activeChat)?.pushName || (activeChat.length > 15 ? activeChat : `+${activeChat}`)}
                   </h3>
                   <span className="text-[10px] text-green-500 font-bold">● Active now</span>
                 </div>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
               <div className="flex justify-center mb-6"><Badge variant="outline" className="bg-white/80 text-gray-500 text-[10px] px-3 py-0.5 uppercase tracking-wider"><ShieldCheck className="w-3 h-3 mr-1 text-teal-600" /> Secure Encryption</Badge></div>
               {messages.map((msg, idx) => (
                 <div key={msg.id || idx} className={`flex ${msg.direction === 'OUTGOING' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[75%] p-3 rounded-xl shadow-sm ${msg.direction === 'OUTGOING' ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-white border text-gray-800 rounded-tl-none'}`}>
                     <p className="text-[13px] leading-relaxed">{msg.body}</p>
                     <div className="flex justify-end gap-1 mt-1 opacity-60"><span className="text-[9px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{msg.direction === 'OUTGOING' && (msg.status === 'READ' ? <CheckCheck className="w-3 h-3 text-white" /> : <Check className="w-3 h-3" />)}</div>
                   </div>
                 </div>
               ))}
            </div>
            <div className="p-4 bg-white border-t">
              <div className="flex gap-2 items-center bg-gray-50 p-1.5 rounded-xl border">
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type message..." className="border-none focus-visible:ring-0 bg-transparent h-10" />
                <Button onClick={sendMessage} className="rounded-lg h-10 w-10 p-0 bg-teal-600 hover:bg-teal-700 shadow-sm"><Send className="w-4 h-4" /></Button>
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
