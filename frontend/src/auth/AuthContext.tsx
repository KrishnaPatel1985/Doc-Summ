import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Frontend-only demo auth.
 *
 * DocSumm has no backend authentication, so this stores a lightweight local
 * profile (name + email only) in localStorage to personalize the UI and gate
 * "save history with a free account" messaging. It is NOT real authentication:
 * no password is ever stored, and no security guarantee is implied.
 */
export interface DemoUser {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: DemoUser | null;
  signIn: (email: string, name?: string) => void;
  createAccount: (name: string, email: string) => void;
  signOut: () => void;
}

const STORAGE_KEY = 'docsumm.demo-user';
const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): DemoUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.email === 'string') {
      return { name: String(parsed.name || ''), email: String(parsed.email) };
    }
  } catch {
    /* corrupt / unavailable storage — treat as signed out */
  }
  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DemoUser | null>(loadUser);

  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — session stays in-memory only */
    }
  }, [user]);

  const nameFromEmail = (email: string) => email.split('@')[0] || 'there';

  const createAccount = (name: string, email: string) =>
    setUser({ name: name.trim() || nameFromEmail(email.trim()), email: email.trim() });

  const signIn = (email: string, name?: string) =>
    setUser({ name: (name && name.trim()) || nameFromEmail(email.trim()), email: email.trim() });

  const signOut = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, signIn, createAccount, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export function initialsOf(user: DemoUser): string {
  const parts = user.name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || user.email[0] || '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
