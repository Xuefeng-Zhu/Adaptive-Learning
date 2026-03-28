'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { insforge } from '@/lib/insforge';
import type { UserProfile } from '@/types';

interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  refreshUser: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data, error } = await insforge.auth.getCurrentUser();
      if (error || !data?.user) {
        setUser(null);
        return;
      }
      const u = data.user;
      const p = (u.profile ?? {}) as Record<string, unknown>;
      setUser({
        id: u.id,
        email: u.email,
        profile: {
          id: u.id,
          name: p.name as string | undefined,
          avatar_url: p.avatar_url as string | undefined,
          email: u.email,
          education_level: p.education_level as string | undefined,
          profession: p.profession as string | undefined,
          interests: p.interests as string | undefined,
          onboarding_complete: p.onboarding_complete as boolean | undefined,
          preferred_adaptation_level: p.preferred_adaptation_level as number | undefined,
        },
      });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    await insforge.auth.signOut();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        refreshUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
