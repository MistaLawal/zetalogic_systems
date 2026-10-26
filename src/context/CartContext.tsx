import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// Guests: cart kept in this browser. Signed-in customers: cart saved to their
// account (cart_items) so it follows them across devices. Prices are never
// stored here; they are recalculated from the database at checkout.
export type CartLine = { productId: string; variantId?: string | null; quantity: number };

type CartCtx = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (line: CartLine) => void;
  setQuantity: (productId: string, variantId: string | null | undefined, quantity: number) => void;
  remove: (productId: string, variantId?: string | null) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = 'zls-cart-v1';
const MAX_QTY = 10;
const same = (a: CartLine, p: string, v?: string | null) => a.productId === p && (a.variantId ?? null) === (v ?? null);

function loadLocal(): CartLine[] {
  try { const raw = localStorage.getItem(KEY); const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v : []; } catch { return []; }
}
function saveLocal(lines: CartLine[]) { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ } }

function merge(a: CartLine[], b: CartLine[]): CartLine[] {
  const out = [...a];
  for (const l of b) {
    const i = out.findIndex((x) => same(x, l.productId, l.variantId));
    if (i === -1) out.push({ ...l });
    else out[i] = { ...out[i], quantity: Math.min(MAX_QTY, Math.max(out[i].quantity, l.quantity)) };
  }
  return out;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lines, setLines] = useState<CartLine[]>(loadLocal);
  const [ready, setReady] = useState(true);
  const syncedUser = useRef<string | null>(null);

  // On sign-in: merge this browser's cart into the account cart, then use the account cart.
  useEffect(() => {
    if (!supabase || !user || syncedUser.current === user.id) {
      if (!user) syncedUser.current = null;
      return;
    }
    syncedUser.current = user.id;
    setReady(false);
    (async () => {
      const { data } = await supabase!.from('cart_items').select('product_id, variant_id, quantity').eq('user_id', user.id);
      const remote: CartLine[] = (data ?? []).map((r) => ({ productId: r.product_id, variantId: r.variant_id, quantity: r.quantity }));
      const merged = merge(remote, loadLocal());
      setLines(merged);
      saveLocal([]);
      await pushRemote(user.id, merged);
      setReady(true);
    })();
  }, [user]);

  // Keep the guest cart in the browser.
  useEffect(() => { if (!user) saveLocal(lines); }, [lines, user]);

  const pushRemote = async (uid: string, next: CartLine[]) => {
    if (!supabase) return;
    await supabase.from('cart_items').delete().eq('user_id', uid);
    if (next.length) await supabase.from('cart_items').insert(next.map((l) => ({ user_id: uid, product_id: l.productId, variant_id: l.variantId ?? null, quantity: l.quantity })));
  };

  // Save the account cart shortly after the last change (one write for quick taps).
  const timer = useRef<number>();
  const update = useCallback((fn: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = fn(prev);
      if (user) {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void pushRemote(user.id, next), 400);
      }
      return next;
    });
  }, [user]);

  const value = useMemo<CartCtx>(() => ({
    lines, ready,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    add: (line) => update((prev) => {
      const i = prev.findIndex((x) => same(x, line.productId, line.variantId));
      if (i === -1) return [...prev, { ...line, quantity: Math.min(MAX_QTY, line.quantity) }];
      const next = [...prev];
      next[i] = { ...next[i], quantity: Math.min(MAX_QTY, next[i].quantity + line.quantity) };
      return next;
    }),
    setQuantity: (p, v, q) => update((prev) => prev.map((x) => (same(x, p, v) ? { ...x, quantity: Math.max(1, Math.min(MAX_QTY, q)) } : x))),
    remove: (p, v) => update((prev) => prev.filter((x) => !same(x, p, v))),
    clear: () => update(() => []),
  }), [lines, ready, update]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
