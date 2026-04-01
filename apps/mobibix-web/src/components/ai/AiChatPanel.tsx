"use client";

import React, { useState, useEffect, useRef } from "react";
import { XIcon, SparklesIcon, Maximize2Icon, Minimize2Icon } from "lucide-react";
import { useAiChat } from "./useAiChat";
import { AiChatBubble } from "./AiChatBubble";
import { AiChatInput } from "./AiChatInput";
import { AiQuotaBadge } from "../common/AiQuotaBadge";

export function AiChatPanel({
  isOpen,
  onClose,
  initialPrompt,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const { messages, send, isLoading, quotaExhausted } = useAiChat({
    module: "MOBILE_SHOP",
    language: "ENGLISH", 
  });

  // Auto-send initial context prompt if opened with one
  useEffect(() => {
    if (isOpen && initialPrompt) {
      send(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-out shadow-lg flex flex-col bg-slate-50 overflow-hidden ${
        expanded
          ? "inset-4 rounded-xl sm:inset-10 sm:rounded-2xl border border-teal-200"
          : "bottom-4 right-4 w-[400px] h-[600px] rounded-2xl border border-teal-100 max-w-[calc(100vw-32px)] sm:bottom-6 sm:right-6"
      }`}
    >
      {/* Header */}
      <div className="bg-teal-600 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2 text-white">
          <div className="bg-white/20 p-1.5 rounded-lg border border-teal-400">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[15px]">MobiBix AI</h3>
            <p className="text-teal-100 text-[11px] leading-tight opacity-90">Your Smart Shop Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-teal-100 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            {expanded ? <Minimize2Icon className="w-4 h-4" /> : <Maximize2Icon className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-teal-100 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Beta Banner */}
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 text-center text-[11px] text-amber-700">
        ✨ <strong>Free Beta</strong> — AI features are free now. Upgrading to paid plans will unlock higher limits soon.
      </div>

      {/* Token Tracker Belt */}
      <div className="bg-white border-b border-gray-100 px-4 py-1 flex justify-between items-center text-xs">
         <span className="text-gray-500 font-medium">Session Active</span>
         <div className="scale-75 origin-right">
            <AiQuotaBadge />
         </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="space-y-2">
          {messages.map((msg) => (
             <AiChatBubble key={msg.id} role={msg.role} content={msg.content} />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <AiChatInput onSend={send} isLoading={isLoading} disabled={quotaExhausted} />
        <div className="mt-3 text-center text-[10px] text-gray-400">
          AI generated responses may be inaccurate. Verify important metrics.
        </div>
      </div>
    </div>
  );
}
