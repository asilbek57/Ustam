/**
 * DATA LAYER — composition root: Supabase if configured, otherwise the
 * bundled servicesDatabase.json. The Supabase SDK loads only when used.
 */
import type { Repository } from './repository';
import { LocalRepository } from './localRepository';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const dataMode: 'supabase' | 'local' = url && key ? 'supabase' : 'local';

let instance: Promise<Repository> | null = null;

export function getRepo(): Promise<Repository> {
  if (!instance) {
    instance =
      dataMode === 'supabase'
        ? Promise.all([import('@supabase/supabase-js'), import('./supabaseRepository')]).then(
            ([sb, m]) => new m.SupabaseRepository(sb.createClient(url!, key!)),
          )
        : Promise.resolve(new LocalRepository());
  }
  return instance;
}
