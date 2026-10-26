import { Link, useLocation } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { useShopper, COMPARE_MAX } from '../context/ShopperContext';

/** Floating reminder that products are waiting to be compared. */
export function CompareBar() {
  const { compare, clearCompare } = useShopper();
  const { pathname } = useLocation();
  if (compare.length === 0 || pathname === '/compare') return null;
  return (
    <div className="compare-bar fixed left-4 z-30 flex sm:left-1/2 sm:-translate-x-1/2 items-center gap-3 rounded-full bg-ink py-2 pl-4 pr-2 text-sm text-white shadow-lift">
      <Scale className="h-4 w-4 text-brand" aria-hidden="true" />
      <span className="tabular-nums">{compare.length} of {COMPARE_MAX} selected</span>
      <button onClick={clearCompare} className="text-white/60 hover:text-white">Clear</button>
      <Link to="/compare" className="rounded-full bg-brand px-4 py-2 font-semibold text-ink hover:bg-[#43A63F]">Compare</Link>
    </div>
  );
}
