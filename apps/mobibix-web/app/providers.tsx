"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { PermissionProvider } from "@/hooks/usePermission";
import { ThemeProvider } from "@/context/ThemeContext";
import { ShopProvider } from "@/context/ShopContext";
import { Toaster } from "react-hot-toast";
import { ReactNode } from "react";

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
