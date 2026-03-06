"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Check, Info, AlertTriangle, Zap, UserPlus, CreditCard } from "lucide-react";
import { getNotifications, markAsRead, NotificationRecord } from "@/services/notifications.api";
import { formatDistanceToNow } from "date-fns";

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.length; // For now all fetched are unread or we filter

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (eventId: string) => {
    switch (eventId) {
      case "tenant.welcome": return <Zap className="text-yellow-500" size={16} />;
      case "subscription.active": return <CreditCard className="text-green-500" size={16} />;
      case "staff.invited": return <UserPlus className="text-blue-500" size={16} />;
      case "tenant.deletion.requested": return <AlertTriangle className="text-red-500" size={16} />;
      default: return <Info className="text-teal-500" size={16} />;
    }
  };

  const getTitle = (notification: NotificationRecord) => {
    switch (notification.eventId) {
      case "tenant.welcome": return "Welcome to MobiBix!";
      case "subscription.active": return "Plan Activated";
      case "subscription.expired": return "Plan Expired";
      case "staff.invited": return "Staff Invited";
      default: return notification.eventId.replace(/\./g, " ").toUpperCase();
    }
  };

  const getMessage = (notification: NotificationRecord) => {
    if (notification.payload?.message) return notification.payload.message;
    if (notification.eventId === "tenant.welcome") return "Your business is now live. Explore your dashboard to get started!";
    return "You have a new update in your account.";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          isOpen
            ? "bg-teal-100 text-teal-800 dark:bg-stone-800 dark:text-white"
            : "text-teal-600 hover:bg-teal-100 hover:text-teal-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        }`}
        title="Notifications & Approvals"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
            {notifications.length > 0 && (
              <button 
                onClick={() => setNotifications([])}
                className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell size={20} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-stone-800">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className="p-4 hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors cursor-pointer group"
                    onClick={() => {
                       markAsRead(n.id);
                       setNotifications(prev => prev.filter(notif => notif.id !== n.id));
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 w-8 h-8 rounded-lg bg-gray-100 dark:bg-stone-700 flex items-center justify-center flex-shrink-0">
                        {getIcon(n.eventId)}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-sm text-gray-900 dark:text-white truncate pr-4">
                            {getTitle(n)}
                          </p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {getMessage(n)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-gray-50 dark:bg-stone-950/50 border-t border-gray-100 dark:border-stone-800 text-center">
            <button 
              className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => setIsOpen(false)}
            >
              See all updates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
