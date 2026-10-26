import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCollection } from './catalog';
import type { PostSummary, ProductSummary, Testimonial } from '../types/catalog';

export type Collection = 'featured' | 'new-arrivals' | 'offers' | 'testimonials' | 'posts';

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'ready'; items: T[] }
  | { status: 'error'; message: string };

async function fetchCollection(name: Collection): Promise<unknown[]> {
  if (!supabase) return [];
  if (name === 'testimonials') {
    const { data, error } = await supabase.from('testimonials').select('id, quote, name, context')
      .eq('is_published', true).order('sort_order').limit(6);
    if (error) throw error;
    return (data ?? []) as Testimonial[];
  }
  if (name === 'posts') {
    const { data, error } = await supabase.from('blog_posts').select('id, slug, title, excerpt, topic, published_at')
      .eq('status', 'published').order('published_at', { ascending: false }).limit(3);
    if (error) throw error;
    return (data ?? []).map((p) => ({ id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, topic: p.topic, publishedAt: p.published_at })) as PostSummary[];
  }
  return getCollection(name) as Promise<ProductSummary[]>;
}

export function useCollection<T>(name: Collection): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    fetchCollection(name)
      .then((items) => live && setState({ status: 'ready', items: items as T[] }))
      .catch(() => live && setState({ status: 'error', message: 'This section could not load. Refresh the page to try again.' }));
    return () => { live = false; };
  }, [name]);
  return state;
}
