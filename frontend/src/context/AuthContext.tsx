import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { User, AuthResponse, SetupStatus } from '../types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

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
    // In the Supabase-only deployment the first administrator is created in
    // Supabase Auth and receives a protected profile row through SQL/RLS.
    if (isSupabaseConfigured) {
      setSetupRequired(false);
      return false;
    }
    const response = await api.get<SetupStatus>('/auth/setup-status');
    setSetupRequired(response.data.setupRequired);
    return response.data.setupRequired;
  };

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      if (isSupabaseConfigured) {
        try {
          const client = getSupabase();
          const { data: { session } } = await client.auth.getSession();
          if (!session) return;

          const { data: profile, error } = await client
            .from('profiles')
            .select('id, name, email, role, company_id, company_name, active')
            .eq('id', session.user.id)
            .single();

          if (error || !profile || !profile.active) {
            await client.auth.signOut();
            return;
          }

          if (active) {
            setUser({
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role,
              companyId: profile.company_id,
              companyName: profile.company_name ?? undefined,
              active: profile.active,
            });
            setCompanyName(profile.company_name ?? null);
          }
        } finally {
          if (active) setIsLoading(false);
        }
        return;
      }

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
    if (isSupabaseConfigured) {
      const client = getSupabase();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw error || new Error('Não foi possível iniciar a sessão.');

      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id, name, email, role, company_id, company_name, active')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile || !profile.active) {
        await client.auth.signOut();
        throw new Error('Esta conta não possui acesso ativo ao sistema.');
      }

      setUser({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        companyId: profile.company_id,
        companyName: profile.company_name ?? undefined,
        active: profile.active,
      });
      setCompanyName(profile.company_name ?? null);
      window.location.hash = '#/dashboard';
      return;
    }

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
    if (isSupabaseConfigured) {
      throw new Error('Crie o primeiro administrador no Supabase Auth e associe o perfil protegido antes de entrar.');
    }
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
    if (isSupabaseConfigured) {
      void getSupabase().auth.signOut();
    }
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
