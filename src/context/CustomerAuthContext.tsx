import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiPost, apiGet } from '@/lib/apiClient';

interface CustomerUser {
  id: string;
  name: string;
  email: string;
}

interface CustomerAuthContextType {
  user: CustomerUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('customerAccessToken');
    if (token) {
      apiGet<{ success: boolean; data: CustomerUser }>('/api/customer/profile')
        .then(res => { if (res.success) setUser(res.data); })
        .catch(() => { localStorage.removeItem('customerAccessToken'); localStorage.removeItem('customerRefreshToken'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiPost<{ success: boolean; data: { accessToken: string; refreshToken: string; customer: CustomerUser } }>('/api/customer/auth/login', { email, password });
      if (res.success) {
        localStorage.setItem('customerAccessToken', res.data.accessToken);
        localStorage.setItem('customerRefreshToken', res.data.refreshToken);
        setUser(res.data.customer);
        return { success: true };
      }
      return { success: false, error: (res as any).error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await apiPost('/api/customer/auth/register', { name, email, password });
      if (res.success) return { success: true };
      return { success: false, error: (res as any).error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('customerRefreshToken');
    if (refreshToken) {
      try { await apiPost('/api/customer/auth/logout', { refreshToken }); } catch {}
    }
    localStorage.removeItem('customerAccessToken');
    localStorage.removeItem('customerRefreshToken');
    setUser(null);
  };

  return (
    <CustomerAuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
}
