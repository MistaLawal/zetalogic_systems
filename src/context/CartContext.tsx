import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// Phase 1: guest cart kept in the browser so the header count is live.
// Phase 3 syncs this with the `carts` table for signed-in customers and
// re-prices every line on the server at checkout.
export type CartLine = { productId: string; variantId?: string; quantity: number };

type CartCtx = {
  lines: CartLine[];
  count: number;
  add: (line: CartLine) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = 'zls-cart-v1';

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ }
  }, [lines]);

  const value = useMemo<CartCtx>(() => ({
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    add: (line) =>
      setLines((prev) => {
        const i = prev.findIndex((l) => l.productId === line.productId && l.variantId === line.variantId);
        if (i === -1) return [...prev, line];
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + line.quantity };
        return next;
      }),
    clear: () => setLines([]),
  }), [lines]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
