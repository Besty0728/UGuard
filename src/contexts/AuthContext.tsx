import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { login as apiLogin } from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (adminKey: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = sessionStorage.getItem('adminKey');
    setIsAuthenticated(!!key);
    setLoading(false);
  }, []);

  const login = useCallback(async (adminKey: string) => {
    try {
      const ok = await apiLogin(adminKey);
      if (ok) {
        sessionStorage.setItem('adminKey', adminKey);
        setIsAuthenticated(true);
      }
      return ok;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('adminKey');
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
