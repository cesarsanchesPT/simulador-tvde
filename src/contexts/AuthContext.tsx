
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  login: (name: string) => void;
  logout: () => void;
  upgradeToPremium: () => void; // Mock function for demo
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session
    const stored = localStorage.getItem('tvde_pro_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  const login = (name: string) => {
    const newUser: UserProfile = {
      id: crypto.randomUUID(),
      name,
      isPremium: false // Default to Free
    };
    setUser(newUser);
    localStorage.setItem('tvde_pro_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('tvde_pro_user');
  };

  const upgradeToPremium = () => {
    if (user) {
      const updated = { ...user, isPremium: true };
      setUser(updated);
      localStorage.setItem('tvde_pro_user', JSON.stringify(updated));
      alert("Conta atualizada para PREMIUM! Acesso ilimitado desbloqueado.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, upgradeToPremium, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
