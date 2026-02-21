"use client";

import { createContext, useContext, ReactNode, FC, useMemo } from "react";
import { useAuth } from "./useAuth";

export interface PermissionContextType {
  /**
   * Evaluates if the current user has the specific permission action.
   * Automatically returns true if user is a System Owner.
   */
  hasPermission: (action: string) => boolean;
  
  /**
   * Evaluates if the current user has ALL of the specified actions.
   */
  hasAllPermissions: (actions: string[]) => boolean;
  
  /**
   * Evaluates if the current user has ANY of the specified actions.
   */
  hasAnyPermission: (actions: string[]) => boolean;
  
  isSystemOwner: boolean;
  activePermissions: string[];
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { authUser } = useAuth();

  const isSystemOwner = authUser?.isSystemOwner ?? false;
  const activePermissions = authUser?.permissions ?? [];

  const contextValue = useMemo<PermissionContextType>(() => {
    const hasPermission = (action: string): boolean => {
      if (isSystemOwner) return true;
      return activePermissions.includes(action);
    };

    const hasAllPermissions = (actions: string[]): boolean => {
      if (isSystemOwner) return true;
      return actions.every(action => activePermissions.includes(action));
    };

    const hasAnyPermission = (actions: string[]): boolean => {
      if (isSystemOwner) return true;
      return actions.some(action => activePermissions.includes(action));
    };

    return {
      hasPermission,
      hasAllPermissions,
      hasAnyPermission,
      isSystemOwner,
      activePermissions,
    };
  }, [isSystemOwner, activePermissions]);

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};

export function usePermission(): PermissionContextType {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermission must be used within a PermissionProvider");
  }
  return context;
}
