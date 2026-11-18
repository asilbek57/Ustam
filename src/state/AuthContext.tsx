/**
 * PRESENTATION LAYER — who is signed in.
 * Exposes the user (client or master), the master's own profile id,
 * unread chat count, and sign in / up / out actions.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getRepo } from '../data';
import type { SignUpInput } from '../data/repository';
import type { ID, User } from '../domain/types';

interface AuthState {
  user: User | null;
  ready: boolean;
  masterProfileId: ID | null;
  unread: number;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (input: SignUpInput) => Promise<User>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [masterProfileId, setMasterProfileId] = useState<ID | null>(null);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    const repo = await getRepo();
    const u = await repo.currentUser();
    setUser(u);
    setMasterProfileId(u?.role === 'master' ? (await repo.getMyMasterProfile())?.id ?? null : null);
    setReady(true);
  }, []);

  const refreshUnread = useCallback(async () => {
    const repo = await getRepo();
    const u = await repo.currentUser();
    if (!u) return setUnread(0);
    const list = await repo.listConversations();
    setUnread(list.filter((c) => c.unreadFor.includes(u.id)).length);
  }, []);

  useEffect(() => {
    let offs: (() => void)[] = [];
    refresh().then(refreshUnread);
    getRepo().then((repo) => {
      offs = [
        repo.subscribe('auth', () => refresh().then(refreshUnread)),
        repo.subscribe('chat', refreshUnread),
        repo.subscribe('masters', refresh),
      ];
    });
    return () => offs.forEach((f) => f());
  }, [refresh, refreshUnread]);

  const value = useMemo<AuthState>(() => ({
    user, ready, masterProfileId, unread, refresh,
    signIn: async (e, p) => { const u = await (await getRepo()).signIn(e, p); await refresh(); return u; },
    signUp: async (i) => { const u = await (await getRepo()).signUp(i); await refresh(); return u; },
    signOut: async () => { await (await getRepo()).signOut(); await refresh(); },
  }), [user, ready, masterProfileId, unread, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
