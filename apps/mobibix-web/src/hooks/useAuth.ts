'use client';

import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'REMOVED_AUTH_PROVIDER/auth';
import { auth } from '@/lib/REMOVED_AUTH_PROVIDER';
import { exchangeFirebaseToken, clearAccessToken, isAuthenticated } from '@/services/auth.api';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  REMOVED_AUTH_PROVIDERUid: string;
  role: 'owner' | 'staff' | 'member';
  tenantId?: string;
}

interface AuthContextType {
  REMOVED_AUTH_PROVIDERUser: FirebaseUser | null;
  authUser: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  logout: () => Promise<void>;
  exchangeToken: (REMOVED_AUTH_PROVIDERUser: FirebaseUser, tenantCode?: string) => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [REMOVED_AUTH_PROVIDERUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      setError(null);

      if (user) {
        setFirebaseUser(user);
        
        // Try to exchange token if not already authenticated
        if (!isAuthenticated()) {
          try {
            const response = await exchangeFirebaseToken(
              await user.getIdToken()
            );
            setAuthUser(response.user);
          } catch (err: any) {
            console.error('Auth exchange error:', err);
            setError(err.message || 'Authentication failed');
            setFirebaseUser(null);
          }
        }
      } else {
        setFirebaseUser(null);
        setAuthUser(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Exchange Firebase token for app JWT
  const exchangeToken = useCallback(
    async (REMOVED_AUTH_PROVIDERUser: FirebaseUser, tenantCode?: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const idToken = await REMOVED_AUTH_PROVIDERUser.getIdToken();
        const response = await exchangeFirebaseToken(idToken, tenantCode);
        
        setAuthUser(response.user);
        setFirebaseUser(REMOVED_AUTH_PROVIDERUser);
      } catch (err: any) {
        setError(err.message || 'Failed to exchange token');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      clearAccessToken();
      setFirebaseUser(null);
      setAuthUser(null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    REMOVED_AUTH_PROVIDERUser,
    authUser,
    isLoading,
    isAuthenticated: !!authUser,
    error,
    logout,
    exchangeToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
