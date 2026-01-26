'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { dummyBars } from '@/lib/data/bars';
import { Bar } from '@/lib/models';

interface AuthContextType {
  isAuthenticated: boolean;
  currentBar: Bar | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateBar: (bar: Bar) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock bar credentials for testing/demo
const mockBarCredentials = [
  { email: 'omv@omv.no', password: 'password123', barId: '5' }, // Territoriet
  { email: 'crowbar@bar.no', password: 'password123', barId: '2' }, // Crowbar
  { email: 'himkok@bar.no', password: 'password123', barId: '3' }, // Himkok
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentBar, setCurrentBar] = useState<Bar | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedBarId = window.localStorage.getItem('barId');
    if (!savedBarId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthenticated(true);
    const foundBar = dummyBars.find((b) => b.id === savedBarId) ?? null;
    setCurrentBar(foundBar);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const credential = mockBarCredentials.find(
      (c) => c.email === email && c.password === password
    );

    if (!credential) return false;

    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('barId', credential.barId);
    }

    const foundBar = dummyBars.find((b) => b.id === credential.barId) ?? null;
    setCurrentBar(foundBar);

    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentBar(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('barId');
    }
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

