import React, { useRef, useEffect } from "react";
import { SendIcon, Loader2Icon } from "lucide-react";

export function AiChatInput({
  onSend,
  isLoading,
  disabled,
}: {
  onSend: (text: string) => void;
  isLoading: boolean;
  disabled: boolean;
}) {
  const [text, setText] = React.useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || isLoading || disabled) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative rounded-2xl border transition-colors bg-white ${
        disabled ? "border-gray-200 opacity-70" : "border-teal-200 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100"
      }`}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "AI features locked..." : "Ask your AI assistant..."}
        disabled={disabled || isLoading}
        className="block w-full resize-none max-h-[120px] bg-transparent border-0 py-3.5 pl-4 pr-14 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
        rows={1}
      />
      <div className="absolute right-2 bottom-2">
        <button
          type="submit"
          disabled={!text.trim() || isLoading || disabled}
          className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
            text.trim() && !isLoading && !disabled
              ? "bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {isLoading ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
        </button>
      </div>
    </form>
  );
}
