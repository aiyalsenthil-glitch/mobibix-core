"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { XIcon, SparklesIcon, Maximize2Icon, Minimize2Icon, GripVertical } from "lucide-react";
import { useAiChat } from "./useAiChat";
import { AiChatBubble } from "./AiChatBubble";
import { AiChatInput } from "./AiChatInput";
import { useTheme } from "@/context/ThemeContext";
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
      className={`fixed z-50 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
        isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-teal-100"
      } ${
        dragging ? "select-none" : ""
      } ${
        expanded
          ? "inset-4 rounded-xl sm:inset-10 sm:rounded-2xl border-2"
          : "bottom-4 right-4 w-[400px] h-[650px] rounded-2xl border max-w-[calc(100vw-32px)] sm:bottom-6 sm:right-6"
      }`}
    >
      {/* Header — drag handle */}
      <div
        onMouseDown={onMouseDown}
        className={`px-4 py-4 flex items-center justify-between shadow-md z-10 ${
          isDark ? "bg-slate-800" : "bg-teal-600"
        } ${!expanded ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        <div className="flex items-center gap-3 text-white">
          {!expanded && <GripVertical className="w-4 h-4 text-white/40 shrink-0" />}
          <div className={`${isDark ? "bg-teal-500/20 text-teal-400" : "bg-white/20 text-white"} p-2 rounded-xl border border-white/10 shadow-inner`}>
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[16px] tracking-tight">MobiBix AI</h3>
            <p className={`${isDark ? "text-slate-400" : "text-teal-100"} text-[11px] font-medium leading-tight opacity-90`}>Your Smart Shop Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            {expanded ? <Minimize2Icon className="w-4 h-4" /> : <Maximize2Icon className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Beta Banner */}
      <div className={`${isDark ? "bg-indigo-900/40 text-indigo-300 border-indigo-800/50" : "bg-amber-50 text-amber-700 border-amber-100"} border-b px-4 py-2 text-center text-[11px] font-semibold italic tracking-wide`}>
        ✨ <strong>Free Beta</strong> — AI features are free now. Premium plans coming soon.
      </div>

      {/* Token Tracker (Improved row layout) */}
      <div className={`${isDark ? "bg-slate-900/50 border-slate-800 text-slate-400" : "bg-white border-gray-100 text-gray-500"} border-b px-4 py-2 flex flex-col gap-2`}>
        <div className="flex justify-between items-center px-1">
          <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">Session Management</span>
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live System
          </span>
        </div>
        <AiQuotaBadge className="p-0! bg-transparent! border-0! shadow-none! scale-100" />
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar ${isDark ? "bg-slate-950/20" : ""}`}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <AiChatBubble key={msg.id} role={msg.role} content={msg.content} />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className={`${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"} shadow-sm rounded-2xl rounded-tl-none px-5 py-4 flex gap-2 items-center`}>
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>
      </div>

      {/* Input */}
      <div className={`p-4 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-t border-gray-100"}`}>
        <AiChatInput onSend={send} isLoading={isLoading} disabled={quotaExhausted} />
        <div className={`mt-3 text-center text-[10px] font-medium tracking-tight ${isDark ? "text-slate-500" : "text-gray-400"}`}>
          AI responses may be inaccurate. Verify important financial data.
        </div>
      </div>
    </div>
  );
}
