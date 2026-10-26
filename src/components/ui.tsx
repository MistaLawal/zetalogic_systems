import { Link } from 'react-router-dom';
import type { ReactNode, AnchorHTMLAttributes } from 'react';

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-site gutter ${className}`}>{children}</div>;
}

type Variant = 'primary' | 'dark' | 'outline' | 'ghostLight';
const variants: Record<Variant, string> = {
  // Black text on brand green: white-on-green fails WCAG contrast at this green.
  primary: 'bg-brand text-ink hover:bg-[#43A63F] active:bg-[#3C963A]',
  dark: 'bg-ink text-white hover:bg-ink-soft',
  outline: 'border border-ink/15 bg-white text-ink hover:border-ink/40',
  ghostLight: 'border border-white/25 text-white hover:border-white/60',
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-btn px-5 py-3 text-[0.95rem] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60';

export function ButtonLink({ to, variant = 'primary', children, className = '' }: { to: string; variant?: Variant; children: ReactNode; className?: string }) {
  return <Link to={to} className={`${base} ${variants[variant]} ${className}`}>{children}</Link>;
}

export function ButtonA({ variant = 'primary', className = '', children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  const ext = rest.href?.startsWith('http');
  return (
    <a {...rest} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </a>
  );
}

export function Button({ variant = 'primary', className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...rest} className={`${base} ${variants[variant]} ${className}`} />;
}

export function SectionHead({ title, intro, action, light = false }: { title: string; intro?: string; action?: ReactNode; light?: boolean }) {
  return (
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-prose">
        <h2 className={`text-h2 ${light ? 'text-white' : 'text-ink'}`}>{title}</h2>
        {intro && <p className={`mt-3 text-lead ${light ? 'text-white/70' : 'text-muted'}`}>{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function TextLink({ to, children, className = '' }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={`font-semibold text-brand-deep underline decoration-brand/40 underline-offset-4 hover:decoration-brand-deep ${className}`}>
      {children}
    </Link>
  );
}
