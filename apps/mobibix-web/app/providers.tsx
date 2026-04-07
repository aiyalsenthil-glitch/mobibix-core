"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "@/context/ThemeContext";
import { ShopProvider } from "@/context/ShopContext";
import { Toaster } from "react-hot-toast";
import { ReactNode } from "react";

const AuthProvider = dynamic(() => import("@/hooks/useAuth").then(mod => mod.AuthProvider), { ssr: false });
const PermissionProvider = dynamic(() => import("@/hooks/usePermission").then(mod => mod.PermissionProvider), { ssr: false });

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
