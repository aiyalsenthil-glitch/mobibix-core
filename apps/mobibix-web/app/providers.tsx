"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "@/context/ThemeContext";
import { ShopProvider } from "@/context/ShopContext";
import { Toaster } from "react-hot-toast";
import { ReactNode } from "react";

const LoadingPlaceholder = () => (
  <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4 z-[9999]">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-medium text-muted-foreground animate-pulse">Initializing securely...</p>
  </div>
);

const AuthProvider = dynamic(() => import("@/hooks/useAuth").then(mod => mod.AuthProvider), { 
  ssr: false,
  loading: LoadingPlaceholder
});

const PermissionProvider = dynamic(() => import("@/hooks/usePermission").then(mod => mod.PermissionProvider), { 
  ssr: false,
  loading: LoadingPlaceholder
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PermissionProvider>
          <ShopProvider>
            {children}
            <Toaster position="top-right" />
          </ShopProvider>
        </PermissionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
