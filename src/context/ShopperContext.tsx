import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// Wishlist lives in the database (signed-in customers only).
// Compare and recently viewed are per-browser conveniences.
const COMPARE_KEY = 'zls-compare-v1';
const RECENT_KEY = 'zls-recent-v1';
export const COMPARE_MAX = 4;
const RECENT_MAX = 12;

function read(key: string): string[] {
  try { const v = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; }
  catch { return []; }
}
function write(key: string, v: string[]) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } }

type ShopperCtx = {
  wishlist: Set<string>;
  wishlistReady: boolean;
  toggleWishlist: (productId: string) => Promise<'added' | 'removed' | 'signin' | 'error'>;
  compare: string[];
  toggleCompare: (productId: string) => 'added' | 'removed' | 'full';
  clearCompare: () => void;
  recent: string[];
  markViewed: (productId: string) => void;
};

const Ctx = createContext<ShopperCtx | null>(null);

export function ShopperProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [wishlistReady, setWishlistReady] = useState(false);
  const [compare, setCompare] = useState<string[]>(() => read(COMPARE_KEY));
  const [recent, setRecent] = useState<string[]>(() => read(RECENT_KEY));

  useEffect(() => {
    let live = true;
    if (!supabase || !user) { setWishlist(new Set()); setWishlistReady(true); return; }
    setWishlistReady(false);
    supabase.from('wishlists').select('product_id').eq('user_id', user.id).then(({ data }) => {
      if (!live) return;
      setWishlist(new Set((data ?? []).map((r: { product_id: string }) => r.product_id)));
      setWishlistReady(true);
    });
    return () => { live = false; };
  }, [user]);

  const toggleWishlist = useCallback<ShopperCtx['toggleWishlist']>(async (productId) => {
    if (!supabase || !user) return 'signin';
    const has = wishlist.has(productId);
    // Optimistic update, rolled back on failure.
    setWishlist((prev) => { const n = new Set(prev); if (has) n.delete(productId); else n.add(productId); return n; });
    const { error } = has
      ? await supabase.from('wishlists').delete().eq('user_id', user.id).eq('product_id', productId)
      : await supabase.from('wishlists').insert({ user_id: user.id, product_id: productId });
    if (error && error.code !== '23505') {
      setWishlist((prev) => { const n = new Set(prev); if (has) n.add(productId); else n.delete(productId); return n; });
      return 'error';
    }
    return has ? 'removed' : 'added';
  }, [user, wishlist]);

  const toggleCompare = useCallback<ShopperCtx['toggleCompare']>((productId) => {
    if (compare.includes(productId)) {
      const next = compare.filter((x) => x !== productId);
      setCompare(next); write(COMPARE_KEY, next);
      return 'removed';
    }
    if (compare.length >= COMPARE_MAX) return 'full';
    const next = [...compare, productId];
    setCompare(next); write(COMPARE_KEY, next);
    return 'added';
  }, [compare]);

  const markViewed = useCallback((productId: string) => {
    setRecent((prev) => {
      const next = [productId, ...prev.filter((x) => x !== productId)].slice(0, RECENT_MAX);
      write(RECENT_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ShopperCtx>(() => ({
    wishlist, wishlistReady, toggleWishlist,
    compare, toggleCompare, clearCompare: () => { setCompare([]); write(COMPARE_KEY, []); },
    recent, markViewed,
  }), [wishlist, wishlistReady, toggleWishlist, compare, toggleCompare, recent, markViewed]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShopper() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useShopper must be used inside ShopperProvider');
  return ctx;
}
