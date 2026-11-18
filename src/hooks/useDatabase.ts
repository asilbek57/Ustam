/**
 * PRESENTATION LAYER — data hooks.
 *  useDatabase()          catalog + ALL masters (OLX listings + registered Ustam masters),
 *                         refreshed live when a master publishes or edits a profile
 *  useLive(fn, topics)    loads data and reloads on realtime events (jobs, chat…)
 *  useAsync(fn)           one-off load
 */
import { useEffect, useState, type DependencyList } from 'react';
import { getRepo } from '../data';
import type { Topic } from '../data/repository';
import type { Database } from '../domain/types';

export function useDatabase(): { db: Database | null; loading: boolean; error: string | null } {
  const { data, loading, error } = useLive(async () => {
    const repo = await getRepo();
    const [base, registered] = await Promise.all([repo.getDatabase(), repo.getRegisteredMasters()]);
    // Registered masters first: they can chat and receive orders on Ustam.
    return { ...base, masters: [...registered, ...base.masters] };
  }, ['masters'], []);
  return { db: data, loading, error };
}

export function useLive<T>(fn: () => Promise<T>, topics: Topic[], deps: DependencyList) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    const run = () => fn().then(
      (data) => { if (alive) setState({ data, loading: false, error: null }); },
      (e) => { if (alive) setState({ data: null, loading: false, error: String(e?.message ?? e) }); },
    );
    run();
    let offs: (() => void)[] = [];
    getRepo().then((repo) => { if (alive) offs = topics.map((t) => repo.subscribe(t, run)); });
    return () => { alive = false; offs.forEach((f) => f()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  return useLive(fn, [], deps);
}

/** Current chat identity (signed-in user or guest); null until a guest writes (Supabase). */
export function useChatMe() {
  const { data } = useLive(async () => (await getRepo()).chatIdentity(), ['auth', 'chat'], []);
  return data ?? null;
}
