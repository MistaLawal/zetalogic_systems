import { useEffect, useState, type DependencyList } from 'react';
import { friendlyError } from '../lib/supabase';

export type Async<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string };

/** Run an async loader and track loading / ready / error, ignoring stale results. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): Async<T> {
  const [state, setState] = useState<Async<T>>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    fn().then(
      (data) => live && setState({ status: 'ready', data }),
      (err) => live && setState({ status: 'error', message: friendlyError(err, 'This section could not load. Refresh the page to try again.') }),
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
