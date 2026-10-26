import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Profile = { id: string; full_name: string | null; phone: string | null };
export type AppRole = 'super_admin' | 'store_manager' | 'order_manager' | 'content_manager' | 'customer_support';

type AuthCtx = {
  ready: boolean;              // initial session check finished
  configured: boolean;         // backend available
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  recovering: boolean;         // arrived from a password-reset link
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [recovering, setRecovering] = useState(false);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!supabase || !uid) { setProfile(null); setRoles([]); return; }
    const [p, r] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone').eq('id', uid).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', uid),
    ]);
    setProfile((p.data as Profile) ?? null);
    setRoles(((r.data ?? []) as { role: AppRole }[]).map((x) => x.role));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
      void loadProfile(data.session?.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
      // Defer DB calls out of the auth callback to avoid deadlocks.
      setTimeout(() => void loadProfile(s?.user.id), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value = useMemo<AuthCtx>(() => ({
    ready,
    configured: !!supabase,
    session,
    user: session?.user ?? null,
    profile,
    roles,
    recovering,
    refreshProfile: () => loadProfile(session?.user.id),
    signOut: async () => { await supabase?.auth.signOut(); },
  }), [ready, session, profile, roles, recovering, loadProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
