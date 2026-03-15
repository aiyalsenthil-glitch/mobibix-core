"use client";

import { useEffect, useState } from "react";
import { getNotifications, type NotificationRecord } from "@/services/notifications.api";
import { Info, X, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function BroadcastAlert() {
  const [broadcast, setBroadcast] = useState<NotificationRecord | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchBroadcast = async () => {
      try {
        const notifications = await getNotifications();
        // Find the most recent admin.broadcast notification
        const latest = notifications.find(
          (n) => n.eventId === "admin.broadcast" && n.payload?.message
        );

        if (latest) {
          const dismissedId = localStorage.getItem(`dismissedBroadcastId_${latest.id}`);
          if (!dismissedId) {
            setBroadcast(latest);
            setIsVisible(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch broadcast notification:", err);
      }
    };

    fetchBroadcast();
    // Poll for new broadcasts every 5 minutes
    const interval = setInterval(fetchBroadcast, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    if (broadcast) {
      localStorage.setItem(`dismissedBroadcastId_${broadcast.id}`, "true");
    }
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && broadcast && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="relative w-full z-50 overflow-hidden"
        >
          <div className="bg-slate-900 border-b border-indigo-500/30 text-white p-3 shadow-2xl backdrop-blur-md">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center animate-pulse">
                  <Bell className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 overflow-hidden">
                  <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 w-fit">
                    SYSTEM UPDATE
                  </span>
                  <p className="text-sm font-medium text-slate-200 truncate pr-4">
                    {broadcast.payload?.message}
                  </p>
                </div>
              </div>

              <button 
                onClick={handleDismiss}
                className="p-1 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Ambient Progress/Pulse Bar at bottom */}
            <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent w-full" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
