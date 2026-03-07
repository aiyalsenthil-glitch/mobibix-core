import { useState, useRef, useEffect } from "react";
import { fetchProtectedClient } from "@/lib/auth/fetch-client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useAiChat(options: { module: string; language?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const sessionId = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    // Show welcome message
    setMessages([
      {
        id: "sys-1",
        role: "assistant",
        content: `Hi! I'm your AI Assistant. Ask me anything about your ${options.module === "MOBILE_SHOP" ? "shop" : "business"} data.`,
      },
    ]);
  }, [options.module]);

  const send = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setQuotaExhausted(false);

    try {
      const { data, res } = await fetchProtectedClient("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          sessionId: sessionId.current,
          module: options.module,
          language: options.language || "ENGLISH",
        }),
      });

      if (!res.ok) {
        throw data;
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "No response generated.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err.statusCode === 403 && err.code === 'AI_TOKEN_QUOTA_EXCEEDED') {
        setQuotaExhausted(true);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Sorry, your AI token quota for this billing cycle has been exhausted. Please upgrade your plan to continue using AI features.",
          },
        ]);
      } else if (err.statusCode === 403 && err.code === 'AI_NOT_IN_PLAN') {
        setQuotaExhausted(true);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "AI features are not included in your current plan. Please upgrade to unlock the AI assistant.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Oops! Something went wrong communicating with the AI. Please try again later.",
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, send, isLoading, quotaExhausted };
}
