"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "@/context/ThemeContext";
import { ShopProvider } from "@/context/ShopContext";
import { Toaster } from "react-hot-toast";
import { ReactNode } from "react";

import { AuthProvider } from "@/hooks/useAuth";
import { PermissionProvider } from "@/hooks/usePermission";

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
