"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Bell, CheckCheck, Gift, CreditCard, AlertTriangle, Zap, UserPlus, Info,
} from "lucide-react";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  NotificationRecord,
} from "@/services/notifications.api";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

export function NotificationDropdown() {
  const { authUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 60 seconds — only for ERP users (tenantId required)
  const refreshUnreadCount = useCallback(async () => {
    if (!authUser?.tenantId) return;
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {}
  }, [authUser?.tenantId]);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  const loadNotifications = async () => {
    if (!authUser?.tenantId) return; // distributors have no tenantId — notifications not applicable
    try {
      setLoading(true);
      const data = await getNotifications();
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && authUser?.tenantId) {
      loadNotifications();
    }
  }, [isOpen, authUser?.tenantId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const getIcon = (eventId: string) => {
    switch (eventId) {
      case "promo.activated": return <Gift className="text-purple-500" size={16} />;
      case "tenant.welcome": return <Zap className="text-yellow-500" size={16} />;
      case "subscription.active": return <CreditCard className="text-green-500" size={16} />;
      case "subscription.expired": return <AlertTriangle className="text-red-500" size={16} />;
      case "staff.invited": return <UserPlus className="text-blue-500" size={16} />;
      default: return <Info className="text-teal-500" size={16} />;
    }
  };

  const getDisplayTitle = (n: NotificationRecord): string => {
    if (n.title) return n.title;
    switch (n.eventId) {
      case "promo.activated": return "🎁 Promo Activated!";
      case "tenant.welcome": return "Welcome to MobiBix!";
      case "subscription.active": return "Plan Activated";
      case "subscription.expired": return "Plan Expired";
      case "staff.invited": return "Staff Invited";
      default: return n.eventId.replace(/\./g, " ").toUpperCase();
    }
  };

  const getDisplayBody = (n: NotificationRecord): string => {
    // Use rich body from payload if available (promo notifications)
    if (n.payload?.body) return n.payload.body;
    if (n.payload?.message) return n.payload.message;
    if (n.eventId === "tenant.welcome") return "Your business is now live. Explore your dashboard to get started!";
    if (n.eventId === "promo.activated") {
      const { durationDays, planName, expiresAt } = n.payload || {};
      if (durationDays && planName) {
        const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
        return `${durationDays} days of ${planName} activated${expiry ? ` until ${expiry}` : ""}.`;
      }
    }
    return "You have a new update in your account.";
  };

  // Distributors have no tenantId — notifications don't apply to them
  if (!authUser?.tenantId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          isOpen
            ? "bg-teal-100 text-teal-800 dark:bg-stone-800 dark:text-white"
            : "text-teal-600 hover:bg-teal-100 hover:text-teal-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        }`}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium flex items-center gap-1"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell size={20} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-stone-800">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors cursor-pointer ${
                      !n.isRead ? "bg-teal-50/40 dark:bg-teal-900/10" : ""
                    }`}
                    onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        n.eventId === "promo.activated"
                          ? "bg-purple-100 dark:bg-purple-900/30"
                          : "bg-gray-100 dark:bg-stone-700"
                      }`}>
                        {getIcon(n.eventId)}
                      </div>

                      {/* Content */}
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <p className={`font-semibold text-sm truncate pr-3 ${
                            !n.isRead ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"
                          }`}>
                            {getDisplayTitle(n)}
                          </p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {getDisplayBody(n)}
                        </p>

                        {/* Special promo badge */}
                        {n.eventId === "promo.activated" && n.payload?.promoCode && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded-full">
                            🎟 {n.payload.promoCode}
                          </span>
                        )}
                      </div>

                      {/* Unread dot */}
                      {!n.isRead && (
                        <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 dark:bg-stone-950/50 border-t border-gray-100 dark:border-stone-800 text-center">
            <button
              className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
