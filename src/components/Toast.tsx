import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastFn = (message: string) => void;
const Ctx = createContext<ToastFn>(() => {});

/** One polite status message at a time, announced to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  const show = useCallback<ToastFn>((m) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="toast pointer-events-none fixed left-1/2 z-[70] -translate-x-1/2">
        {msg && <div className="toast-in rounded-btn bg-ink px-4 py-3 text-sm font-medium text-white shadow-lift">{msg}</div>}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
