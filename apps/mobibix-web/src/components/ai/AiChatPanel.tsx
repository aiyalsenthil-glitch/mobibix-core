"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { XIcon, SparklesIcon, Maximize2Icon, Minimize2Icon, GripVertical } from "lucide-react";
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
  const [pos, setPos] = useState({ x: 0, y: 0 }); // offset from default bottom-right
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const sentPromptRef = useRef<string | undefined>(undefined);

  const { messages, send, isLoading, quotaExhausted } = useAiChat({
    module: "MOBILE_SHOP",
    language: "ENGLISH",
  });

  // Auto-send initial prompt only once per unique prompt
  useEffect(() => {
    if (isOpen && initialPrompt && initialPrompt !== sentPromptRef.current) {
      sentPromptRef.current = initialPrompt;
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

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (expanded) return;
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    setDragging(true);
  }, [expanded, pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      setPos({
        x: dragStart.current.px + (e.clientX - dragStart.current.mx),
        y: dragStart.current.py + (e.clientY - dragStart.current.my),
      });
    };
    const onUp = () => { setDragging(false); dragStart.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  if (!isOpen) return null;

  const panelStyle = expanded
    ? {}
    : { transform: `translate(${pos.x}px, ${pos.y}px)` };

  return (
    <div
      style={panelStyle}
      className={`fixed z-50 shadow-xl flex flex-col bg-slate-50 overflow-hidden transition-shadow ${
        dragging ? "shadow-2xl select-none" : ""
      } ${
        expanded
          ? "inset-4 rounded-xl sm:inset-10 sm:rounded-2xl border border-teal-200"
          : "bottom-4 right-4 w-[380px] h-[580px] rounded-2xl border border-teal-100 max-w-[calc(100vw-32px)] sm:bottom-6 sm:right-6"
      }`}
    >
      {/* Header — drag handle */}
      <div
        onMouseDown={onMouseDown}
        className={`bg-teal-600 px-4 py-3 flex items-center justify-between shadow-sm z-10 ${!expanded ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        <div className="flex items-center gap-2 text-white">
          {!expanded && <GripVertical className="w-4 h-4 text-teal-300 shrink-0" />}
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
        ✨ <strong>Free Beta</strong> — AI features are free now. Paid plans unlock higher limits soon.
      </div>

      {/* Token Tracker */}
      <div className="bg-white border-b border-gray-100 px-4 py-1 flex justify-between items-center text-xs">
        <span className="text-gray-500 font-medium">Session Active</span>
        <div className="scale-75 origin-right">
          <AiQuotaBadge />
        </div>
      </div>

      {/* Messages */}
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

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <AiChatInput onSend={send} isLoading={isLoading} disabled={quotaExhausted} />
        <div className="mt-3 text-center text-[10px] text-gray-400">
          AI responses may be inaccurate. Verify important data.
        </div>
      </div>
    </div>
  );
}
