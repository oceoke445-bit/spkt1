'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { spktApi } from '@/lib/spktApi';
import type { OfficerDivision } from '@/lib/types/spkt';

export type UserRole = 'user' | 'petugas' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  nik?: string;
  phone?: string;
  avatarUrl?: string;
  officerId?: string;
  officerDivision?: OfficerDivision;
}

function mapSessionUser(sessionUser: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  nik?: string;
  phone?: string;
  avatarUrl?: string;
  officerId?: string;
  officerDivision?: OfficerDivision;
}): User {
  return {
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email,
    role: sessionUser.role,
    nik: sessionUser.nik,
    phone: sessionUser.phone,
    avatarUrl: sessionUser.avatarUrl,
    officerId: sessionUser.officerId,
    officerDivision: sessionUser.officerDivision,
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ requires2fa?: boolean; tempToken?: string }>;
  register: (payload: {
    email: string;
    password: string;
    name: string;
    nik: string;
    phone: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setUser(null);
        setLoading(false);
      }
    }, 8000);

    spktApi
      .getSession()
      .then(({ user: sessionUser }) => {
        if (cancelled) return;
        if (sessionUser) {
          setUser(mapSessionUser(sessionUser));
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) {
          window.clearTimeout(timeout);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const result = await spktApi.login(email, password);
    if ('requires2fa' in result && result.requires2fa) {
      return { requires2fa: true, tempToken: result.tempToken };
    }
    if ('user' in result && result.user) {
      setUser(mapSessionUser(result.user));
    }
    return {};
  };

  const register = async (payload: {
    email: string;
    password: string;
    name: string;
    nik: string;
    phone: string;
  }) => {
    const { user: dbUser } = await spktApi.register(payload);
    setUser(mapSessionUser(dbUser));
  };

  const refreshUser = async () => {
    const { user: profile } = await spktApi.getProfile();
    setUser(mapSessionUser(profile));
  };

  const logout = async () => {
    await spktApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};
