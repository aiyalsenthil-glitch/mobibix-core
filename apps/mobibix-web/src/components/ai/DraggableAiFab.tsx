"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SparklesIcon } from "lucide-react";

export function DraggableAiFab({ onClick }: { onClick: () => void }) {
  const [pos, setPos] = useState({ x: -24, y: -24 }); // Using offset from bottom-right
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const hasMovedRef = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    setDragging(true);
    hasMovedRef.current = false;
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMovedRef.current = true;
      }

      setPos({
        x: dragStart.current.px + dx,
        y: dragStart.current.py + dy,
      });
    };

    const onUp = () => {
      setDragging(false);
      dragStart.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const handleButtonClick = () => {
    if (!hasMovedRef.current) {
      onClick();
    }
  };

  return (
    <button
      onMouseDown={onMouseDown}
      onClick={handleButtonClick}
      style={{ 
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: dragging ? "none" : "all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)" 
      }}
      className={`fixed bottom-0 right-0 z-40 bg-teal-600 hover:bg-teal-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-2xl active:scale-95 touch-none ${
        dragging ? "cursor-grabbing scale-110 shadow-2xl" : "cursor-grab"
      }`}
      title="Drag to move MobiBix AI"
    >
      <div className="relative">
        <SparklesIcon className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
        </span>
      </div>
    </button>
  );
}
