'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Bar } from '@/lib/models';

interface AuthContextType {
  isAuthenticated: boolean;
  currentBar: Bar | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateBar: (bar: Bar) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock bar credentials for testing
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
    const savedBarId = localStorage.getItem('barId');
    if (savedBarId) {
      // In a real app, fetch bar data from API
      // For now, we'll set authenticated state
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication
    const credential = mockBarCredentials.find(
      (c) => c.email === email && c.password === password
    );

    if (credential) {
      setIsAuthenticated(true);
      localStorage.setItem('barId', credential.barId);
      
      // In a real app, fetch bar data from API
      // For now, we'll set it when needed
      return true;
    }

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

