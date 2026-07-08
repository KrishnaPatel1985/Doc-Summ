import React, { createContext, useContext, useEffect, useState } from 'react';
import { clearAuthToken, fetchCurrentUser, getAuthToken, loginAccount, registerAccount, setAuthToken } from '../api/client';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  authReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  createAccount: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        localStorage.removeItem('docsumm.demo-user');
      } catch {
        /* Ignore storage errors. */
      }

      if (!getAuthToken()) {
        setAuthReady(true);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        if (!cancelled) setUser(currentUser);
      } catch {
        clearAuthToken();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };

    void loadUser();
    return () => { cancelled = true; };
  }, []);

  const createAccount = async (name: string, email: string, password: string) => {
    const auth = await registerAccount(name, email, password);
    setAuthToken(auth.access_token);
    setUser(auth.user);
  };

  const signIn = async (email: string, password: string) => {
    const auth = await loginAccount(email, password);
    setAuthToken(auth.access_token);
    setUser(auth.user);
  };

  const signOut = () => {
    clearAuthToken();
    setUser(null);
  };

  const refreshUser = async () => {
    if (!getAuthToken()) {
      setUser(null);
      return;
    }
    try {
      setUser(await fetchCurrentUser());
    } catch {
      clearAuthToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, authReady, signIn, createAccount, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export function initialsOf(user: AuthUser): string {
  const parts = user.name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || user.email[0] || '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
