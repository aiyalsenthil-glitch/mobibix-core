"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authGuard } from "@/lib/authGuard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SubscriptionBanner } from "@/components/layout/SubscriptionBanner";
import { getSubscription, type SubscriptionDetails } from "@/services/tenant.api";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { GlobalApprovalInterceptor } from "@/components/auth/GlobalApprovalInterceptor";
import { AiChatPanel } from "@/components/ai/AiChatPanel";
import { SparklesIcon } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { authUser, isLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme: _theme } = useTheme();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();

  useEffect(() => {
    const handleOpenAi = (e: CustomEvent) => {
      setAiOpen(true);
      if (e.detail?.prompt) {
        setInitialPrompt(e.detail.prompt);
      }
    };
    window.addEventListener("open-ai-chat", handleOpenAi as EventListener);
    return () => window.removeEventListener("open-ai-chat", handleOpenAi as EventListener);
  }, []);

  useEffect(() => {
    if (isLoading || !authUser || !authUser.tenantId) return;
    
    const fetchSub = async () => {
      try {
        const data = await getSubscription();
        setSubscription(data.current);
      } catch (err) {
        console.warn("Failed to fetch subscription for banner", err);
      }
    };
    fetchSub();
  }, [authUser, isLoading]);

  useEffect(() => {
    // Don't check guard until auth has finished loading
    if (isLoading) return;

    if (authUser) {
      // Auth resolved with a valid user — no guard check needed
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(true);
    } else {
      // Auth finished loading but no user → check guard (may redirect to signin)
      const ok = authGuard(router);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(ok);
    }
  }, [router, isLoading, authUser]);

  useEffect(() => {
    if (!isReady || isLoading) return;

    if (authUser && !authUser.tenantId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRedirecting(true);
      router.replace("/onboarding");
    }
  }, [authUser, isLoading, isReady, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored) setIsCollapsed(JSON.parse(stored));

    // Listen for storage changes from sidebar
    const handleStorageChange = () => {
      const stored = localStorage.getItem("sidebarCollapsed");
      if (stored) setIsCollapsed(JSON.parse(stored));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false);
  }, [router]);

  // Only show full-screen loader on initial app boot
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (!isLoading && isReady) {
      setIsInitialLoad(false);
    }
  }, [isLoading, isReady]);

  if (isInitialLoad && (isLoading || !isReady)) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">
          Verifying access...
        </p>
      </div>
    );
  }

  if (isRedirecting) {
    return null; // Let the router handle redirection
  }

  const marginLeft = mounted && isCollapsed ? "lg:ml-20" : "lg:ml-60";

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <Topbar
        isCollapsed={mounted && isCollapsed}
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      {subscription && (
        <div className={`${marginLeft} pt-16 transition-all duration-300`}>
          <SubscriptionBanner 
            daysLeft={subscription.daysLeft} 
            status={subscription.subscriptionStatus} 
          />
        </div>
      )}
      <main
        className={`${marginLeft} ${subscription ? 'pt-4' : 'pt-20'} px-4 lg:px-8 py-8 transition-all duration-300 bg-white dark:bg-slate-950 min-h-screen`}
      >
        <GlobalApprovalInterceptor />
        {children}
      </main>

      {/* Global AI Chat Integration */}
      <AiChatPanel 
        isOpen={aiOpen} 
        onClose={() => {
          setAiOpen(false);
          setInitialPrompt(undefined);
        }} 
        initialPrompt={initialPrompt}
      />
      {!aiOpen && (
        <button
          onClick={() => setAiOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-teal-600 hover:bg-teal-700 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2 group border-4 border-white dark:border-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/30"
          title="Ask AI Assistant"
        >
          <SparklesIcon className="w-6 h-6 animate-pulse" />
          <span className="font-semibold px-1 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap">
            Ask AI
          </span>
        </button>
      )}
    </div>
  );
}
