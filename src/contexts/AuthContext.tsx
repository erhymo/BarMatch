'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Bar } from '@/lib/models';

interface AuthContextType {
  isAuthenticated: boolean;
  currentBar: Bar | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateBar: (bar: Bar) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentBar, setCurrentBar] = useState<Bar | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
	  // Innlogging er deaktivert inntil vi har ekte backend/auth.
	  void email;
	  void password;
	  return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentBar(null);
    localStorage.removeItem('barId');
  };

  const updateBar = (bar: Bar) => {
    setCurrentBar(bar);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentBar,
        login,
        logout,
        updateBar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

