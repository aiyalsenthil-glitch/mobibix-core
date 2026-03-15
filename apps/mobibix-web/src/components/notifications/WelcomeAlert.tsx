"use client";

import { useEffect, useState } from "react";
import { getNotifications, type NotificationRecord } from "@/services/notifications.api";
import { PartyPopper, X } from "lucide-react";

export function WelcomeAlert() {
  const [welcomeNotification, setWelcomeNotification] = useState<NotificationRecord | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchWelcome = async () => {
      try {
        const notifications = await getNotifications();
        // Find the most recent tenant.welcome notification that has a message
        const welcome = notifications.find(
          (n) => n.eventId === "tenant.welcome" && n.payload?.message
        );

        if (welcome) {
          // Check if this specific notification has been dismissed
          const dismissedId = localStorage.getItem("dismissedWelcomeId");
          if (dismissedId !== welcome.id) {
            setWelcomeNotification(welcome);
            setIsVisible(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch welcome notification:", err);
      }
    };

    fetchWelcome();
  }, []);

  const handleDismiss = () => {
    if (welcomeNotification) {
      localStorage.setItem("dismissedWelcomeId", welcomeNotification.id);
    }
    setIsVisible(false);
  };

  if (!isVisible || !welcomeNotification) return null;

  const promoMessage = welcomeNotification.payload?.message;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-teal-500 to-emerald-600 dark:from-teal-600 dark:to-emerald-700 text-white p-4 shadow-lg animate-in slide-in-from-top duration-500">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-black/10 rounded-full blur-3xl" />
      
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-2xl shadow-inner animate-bounce">
            <PartyPopper className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-lg leading-tight">Welcome to the Platform! 🎉</h4>
            <p className="text-white/90 text-sm font-medium mt-0.5">
              {promoMessage}
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleDismiss}
          className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
