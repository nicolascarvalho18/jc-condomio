import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { User, AuthResponse, SetupStatus } from '../types';

interface AuthContextType {
  user: User | null;
  companyName: string | null;
  setupRequired: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setupAdmin: (data: any) => Promise<void>;
  logout: () => void;
  checkSetupStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkSetupStatus = async (): Promise<boolean> => {
    const response = await api.get<SetupStatus>('/auth/setup-status');
    setSetupRequired(response.data.setupRequired);
    return response.data.setupRequired;
  };

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      const token = localStorage.getItem('jc_access_token');
      try {
        if (token) {
          const response = await api.get<User & { companyName?: string }>('/auth/me');
          if (active) {
            setUser(response.data);
            setCompanyName(response.data.companyName || null);
          }
        } else {
          await checkSetupStatus();
        }
      } catch {
        localStorage.removeItem('jc_access_token');
        localStorage.removeItem('jc_refresh_token');
        localStorage.removeItem('jc_user');
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    restoreSession();
    const handleSessionExpired = () => {
      setUser(null);
      setCompanyName(null);
      window.location.hash = '#/login';
    };
    window.addEventListener('auth:expired', handleSessionExpired);
    return () => { active = false; window.removeEventListener('auth:expired', handleSessionExpired); };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    const data = response.data;
    localStorage.setItem('jc_access_token', data.accessToken);
    localStorage.setItem('jc_refresh_token', data.refreshToken);

    const currentUser: User = {
      id: data.userId,
      name: data.name,
      email: data.email,
      role: data.role,
      companyId: data.companyId,
      companyName: data.companyName,
    };

    localStorage.setItem('jc_user', JSON.stringify(currentUser));
    setUser(currentUser);
    setCompanyName(data.companyName);
    window.location.hash = '#/dashboard';
  };

  const setupAdmin = async (formData: any) => {
    const response = await api.post<AuthResponse>('/auth/setup-admin', formData);
    const data = response.data;
    localStorage.setItem('jc_access_token', data.accessToken);
    localStorage.setItem('jc_refresh_token', data.refreshToken);

    const currentUser: User = {
      id: data.userId,
      name: data.name,
      email: data.email,
      role: data.role,
      companyId: data.companyId,
      companyName: data.companyName,
    };

    localStorage.setItem('jc_user', JSON.stringify(currentUser));
    setUser(currentUser);
    setCompanyName(data.companyName);
    setSetupRequired(false);
  };

  const logout = () => {
    localStorage.removeItem('jc_access_token');
    localStorage.removeItem('jc_refresh_token');
    localStorage.removeItem('jc_user');
    setUser(null);
    setCompanyName(null);
    window.location.hash = '#/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        companyName,
        setupRequired,
        isLoading,
        login,
        setupAdmin,
        logout,
        checkSetupStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider');
  }
  return context;
};
