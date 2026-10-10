import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { publicAdminClient } from '../api/client';

interface SuperAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
}

interface AuthContextType {
  user: SuperAdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: SuperAdminUser) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hydrates session on mount
    const storedUser = localStorage.getItem('superadmin_profile');

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.isSuperAdmin) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('superadmin_profile');
          setUser(null);
        }
      } catch {
        localStorage.removeItem('superadmin_profile');
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: SuperAdminUser) => {
    if (!userData.isSuperAdmin) {
      throw new Error("Access Denied: SuperAdmin clearance required.");
    }
    localStorage.setItem('superadmin_profile', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await publicAdminClient.post('/auth/logout', {});
    } catch {
      // Ignore network errors during logout cleanup
    }
    localStorage.removeItem('superadmin_profile');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AdminAuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};