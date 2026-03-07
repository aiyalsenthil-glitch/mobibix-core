import React from "react";
import ReactMarkdown from "react-markdown";

export function AiChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isAssistant = role === "assistant";

  return (
    <div
      className={`flex w-full mb-4 ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed relative ${
          isAssistant
            ? "bg-white text-gray-800 border border-gray-200 shadow-sm rounded-tl-sm"
            : "bg-teal-600 text-white rounded-tr-sm shadow-md"
        }`}
      >
        {isAssistant ? (
          <div className="prose prose-sm prose-gray max-w-none">
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => <a className="text-teal-600 hover:underline" {...props} />,
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
              }}
            >
              {content || ""}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap font-medium">{content}</div>
        )}
      </div>
    </div>
  );
}
