'use client';
import React, { createContext, useContext, useState } from 'react';

interface User {
  rw_id: string;
  rw_email: string;
  rw_full_name: string;
  rw_role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('rw_user');
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rw_token');
    }
    return null;
  });

  const [refreshToken, setRefreshToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rw_refresh_token');
    }
    return null;
  });

  const login = (newToken: string, newRefreshToken: string, newUser: User) => {
    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setUser(newUser);
    localStorage.setItem('rw_token', newToken);
    localStorage.setItem('rw_refresh_token', newRefreshToken);
    localStorage.setItem('rw_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem('rw_token');
    localStorage.removeItem('rw_refresh_token');
    localStorage.removeItem('rw_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};