import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UserRole = 'agent' | 'supervisor' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  availability?: 'available' | 'busy' | 'offline';
  skills?: string[];
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requires2fa?: boolean; userId?: string }>;
  verify2fa: (userId: string, totpToken: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API = import.meta.env.VITE_API_URL || '';

// Token storage helpers
const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');
const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
};
const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// Decode JWT without verification (client-side only — server verifies)
const decodeUser = (token: string): User | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) return null;
    return {
      id: payload.sub,
      email: payload.email || '',
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Attempt to restore session from stored tokens
  useEffect(() => {
    const restore = async () => {
      const token = getAccessToken();
      if (!token) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      // Check if token is still valid
      const user = decodeUser(token);
      if (user) {
        setState({ user, isLoading: false, isAuthenticated: true });
        return;
      }
      // Token expired — try refresh
      const refreshOk = await refreshTokenInternal();
      if (!refreshOk) {
        clearTokens();
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.error };
      }
      const { requires2fa, userId, accessToken, refreshToken, user } = data.data;
      if (requires2fa) {
        return { success: true, requires2fa: true, userId };
      }
      setTokens(accessToken, refreshToken);
      setState({ user, isLoading: false, isAuthenticated: true });
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const verify2fa = useCallback(async (userId: string, totpToken: string) => {
    try {
      const res = await fetch(`${API}/api/auth/2fa/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, totpToken }),
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.error };
      }
      const { accessToken, refreshToken, user } = data.data;
      setTokens(accessToken, refreshToken);
      setState({ user, isLoading: false, isAuthenticated: true });
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(`${API}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Ignore logout network errors
      }
    }
    clearTokens();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const refreshTokenInternal = useCallback(async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json();
      if (data.success) {
        setTokens(data.data.accessToken, refreshToken);
        const user = decodeUser(data.data.accessToken);
        if (user) {
          setState({ user, isLoading: false, isAuthenticated: true });
          return true;
        }
      }
    } catch {
      // Ignore refresh errors
    }
    return false;
  }, []);

  // Expose refreshToken on context
  const value: AuthContextType = {
    ...state,
    login,
    verify2fa,
    logout,
    refreshToken: refreshTokenInternal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
