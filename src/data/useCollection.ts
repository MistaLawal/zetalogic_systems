import { useEffect, useState } from 'react';

// Phase 1: no database is connected, so every collection resolves empty and the
// UI shows its designed empty state. Phase 2 swaps the body of `fetchCollection`
// for Supabase queries (published rows only, enforced by RLS).
export type Collection = 'featured' | 'new-arrivals' | 'offers' | 'testimonials' | 'posts';

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'ready'; items: T[] }
  | { status: 'error'; message: string };

async function fetchCollection<T>(_name: Collection): Promise<T[]> {
  return [];
}

export function useCollection<T>(name: Collection): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    fetchCollection<T>(name)
      .then((items) => live && setState({ status: 'ready', items }))
      .catch(() => live && setState({ status: 'error', message: 'This section could not load. Refresh the page to try again.' }));
    return () => { live = false; };
  }, [name]);
  return state;
}
