import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthResult } from '../services/auth';
import { onSessionExpired } from '../services/api';
import { UserObj } from '../types/api';

interface AuthContextType {
  user: UserObj | null;
  isLoading: boolean;
  isGuest: boolean;
  login: (identifier: string, password: string) => Promise<AuthResult>;
  confirmMfa: (mfaToken: string, code: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserObj | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    loadUser();
    onSessionExpired(() => { setUser(null); setIsGuest(true); });
    return () => onSessionExpired(null);
  }, []);

  const loadUser = async () => {
    try {
      const u = await authService.getUser();
      if (u) {
        setUser(u);
        setIsGuest(false);
      } else {
        setUser(null);
        setIsGuest(true);
      }
    } catch (e) {
      setIsGuest(true);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (identifier: string, password: string) => {
    const result = await authService.login(identifier, password);
    if (result.success) {
      await loadUser();
    }
    return result;
  };

  const confirmMfa = async (mfaToken: string, code: string) => {
    const result = await authService.confirmMfa(mfaToken, code);
    if (result.success) {
      await loadUser();
    }
    return result;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsGuest(true);
  };

  const setAsGuest = () => {
    setIsGuest(true);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isGuest, login, confirmMfa, logout, refreshUser, setAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
