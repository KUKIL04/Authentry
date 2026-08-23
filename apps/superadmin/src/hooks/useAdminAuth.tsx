import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

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
  login: (accessToken: string, refreshToken: string, userData: SuperAdminUser) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hydrates session on mount
    const token = localStorage.getItem('superadmin_access_token');
    const refreshToken = localStorage.getItem('superadmin_refresh_token');
    const storedUser = localStorage.getItem('superadmin_profile');

    if (token && refreshToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.isSuperAdmin) {
          setUser(parsedUser);
        } else {
          logout();
        }
      } catch {
        logout();
      }
    } else {
      logout();
    }
    setIsLoading(false);
  }, []);

  const login = (accessToken: string, refreshToken: string, userData: SuperAdminUser) => {
    if (!userData.isSuperAdmin) {
      throw new Error("Access Denied: SuperAdmin clearance required.");
    }
    // Stores both tokens and profile credentials cleanly
    localStorage.setItem('superadmin_access_token', accessToken);
    localStorage.setItem('superadmin_refresh_token', refreshToken);
    localStorage.setItem('superadmin_profile', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('superadmin_access_token');
    localStorage.removeItem('superadmin_refresh_token');
    localStorage.removeItem('superadmin_profile');
    setUser(null);
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