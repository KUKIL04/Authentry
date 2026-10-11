import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import { AuthAPI } from '../api/auth.api';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'UNVERIFIED' | 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  isAdmin: boolean;
  roles?: string[];
  entitlements?: Record<string, Record<string, string>>;
  isProfileIncomplete?: boolean;
  isProfileEnforced?: boolean;
}

export interface TenantSettings {
  name: string;
  logoUrl: string;
  themeColor: string;
}

interface AuthContextType {
  user: User | null;
  tenantSettings: TenantSettings | null; 
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  refreshBranding: () => Promise<void>; 
  updateUserContext: (updates: Partial<User>) => void;

}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Global CSS Injection Helpers ---
const adjustColor = (color: string, amount: number) => {
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
};

const applyTheme = (color: string) => {
  const root = document.documentElement;
  root.style.setProperty('--theme-500', color);
  root.style.setProperty('--theme-400', adjustColor(color, 20));
  root.style.setProperty('--theme-600', adjustColor(color, -20));
  root.style.setProperty('--theme-700', adjustColor(color, -40));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const updateUserContext = (updates: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updated = { ...prevUser, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  // Fetches using the public branding endpoint to avoid 403 errors
  const fetchAndApplyBranding = async (forceTenantId?: string) => {
    try {
      let currentTenantId = forceTenantId;
      
      // If no ID is passed, try to pull it from the active local storage session
      if (!currentTenantId) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          currentTenantId = JSON.parse(storedUser).tenantId;
        }
      }

      // If we still don't have an ID, we can't fetch tenant branding
      if (!currentTenantId) return;

      const data = await AuthAPI.getTenantBranding(currentTenantId);
      if (data) {
        const newSettings = {
          name: data.name || '',
          logoUrl: data.logoUrl || '',
          themeColor: data.themeColor || '#e49b0f'
        };
        setTenantSettings(newSettings);
        localStorage.setItem('tenantSettings', JSON.stringify(newSettings));
        if (newSettings.themeColor) applyTheme(newSettings.themeColor);
      }
    } catch (err) {
      console.error("Failed to fetch tenant branding", err);
    }
  };

  useEffect(() => {
    const initializeAuth = () => {
      const storedUser = localStorage.getItem('user');
      const storedSettings = localStorage.getItem('tenantSettings');

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          if (storedSettings) {
            const parsedSettings = JSON.parse(storedSettings);
            setTenantSettings(parsedSettings);
            if (parsedSettings.themeColor) applyTheme(parsedSettings.themeColor);
          }
          fetchAndApplyBranding();
        } catch (error) {
          localStorage.removeItem('user');
          localStorage.removeItem('tenantSettings');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    // Pass the specific tenantId so it fetches instantly on login
    fetchAndApplyBranding(userData.tenantId); 
  };

  const logout = async () => {
    try {
      let endpoint: string | undefined;
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.getRegistration();
        const sub = await registration?.pushManager.getSubscription();
        endpoint = sub?.endpoint;
      }
      await AuthAPI.logout(endpoint);
    } catch (err) {}
    localStorage.removeItem('user');
    localStorage.removeItem('tenantSettings');
    setUser(null);
    setTenantSettings(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      tenantSettings,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshBranding: fetchAndApplyBranding,
      updateUserContext
    }}>
      {children}
    </AuthContext.Provider>
  );
};