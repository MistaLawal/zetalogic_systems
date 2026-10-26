import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Container } from './ui';

export function PageHero({ title, intro, crumbs, children }: { title: string; intro?: string; crumbs?: { label: string; to?: string }[]; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-paper-line bg-paper-grey">
      <div aria-hidden="true" className="brand-wedge absolute -top-8 bottom-[-30%] right-[-6%] hidden w-[22%] bg-brand lg:block" />
      <Container className="relative py-12 lg:py-16">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-5 text-[0.85rem] text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-1.5">
                  {c.to ? <Link to={c.to} className="hover:text-ink">{c.label}</Link> : <span aria-current="page" className="text-ink">{c.label}</span>}
                  {i < crumbs.length - 1 && <span aria-hidden="true">/</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="max-w-[44rem] text-[clamp(2rem,4.2vw,3.25rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-ink [text-wrap:balance]">{title}</h1>
        {intro && <p className="mt-4 max-w-prose text-lead text-muted">{intro}</p>}
        {children}
      </Container>
    </section>
  );
}
