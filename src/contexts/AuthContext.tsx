import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AdminRole, Profile } from '@/types/database';

export type AdminPermission =
  | 'manage_settings'
  | 'manage_admins'
  | 'manage_cms'
  | 'manage_tournaments'
  | 'manage_registrations'
  | 'verify_payments'
  | 'manage_teams_draw'
  | 'manage_matches'
  | 'manage_gallery'
  | 'manage_announcements'
  | 'manage_members'
  | 'view_dashboard';

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  SUPER_ADMIN: [
    'manage_settings',
    'manage_admins',
    'manage_cms',
    'manage_tournaments',
    'manage_registrations',
    'verify_payments',
    'manage_teams_draw',
    'manage_matches',
    'manage_gallery',
    'manage_announcements',
    'manage_members',
    'view_dashboard',
  ],
  TOURNAMENT_ADMIN: [
    'manage_tournaments',
    'manage_registrations',
    'manage_teams_draw',
    'manage_matches',
    'manage_members',
    'manage_announcements',
    'view_dashboard',
  ],
  FINANCE_ADMIN: ['verify_payments', 'view_dashboard'],
  EDITOR: ['manage_cms', 'manage_settings', 'manage_gallery', 'manage_announcements', 'manage_members', 'view_dashboard'],
  VIEWER: ['view_dashboard'],
};

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isConfigured: boolean;
  isAdmin: boolean;
  can: (permission: AdminPermission) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data) {
      setProfile(data as Profile);
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        await loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabase credentials are not configured.') };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!supabase) {
      return { error: new Error('Supabase credentials are not configured.') };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const isAdmin = Boolean(profile && profile.is_active);

  const can = useCallback(
    (permission: AdminPermission) => {
      if (!profile || !profile.is_active) return false;
      return ROLE_PERMISSIONS[profile.role]?.includes(permission) ?? false;
    },
    [profile]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured: isSupabaseConfigured,
        isAdmin,
        can,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
