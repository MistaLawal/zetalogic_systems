import { useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { Container, TextLink } from '../components/ui';
import { EnquiryForm } from '../components/EnquiryForm';
import { services } from '../config/site';
import { usePageMeta } from '../lib/seo';
import NotFound from './NotFound';

export default function ServiceDetail() {
  const { slug } = useParams();
  const s = services.find((x) => x.slug === slug);
  usePageMeta(s?.name ?? 'Service not found', s?.short ?? 'This service page could not be found.');
  if (!s) return <NotFound />;
  const others = services.filter((x) => x.slug !== s.slug);

  return (
    <>
      <PageHero title={s.name} intro={s.intro} crumbs={[{ label: 'Home', to: '/' }, { label: 'IT services', to: '/services' }, { label: s.name }]} />

      <section className="bg-white py-16 lg:py-20">
        <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="text-h2 text-ink">How it helps your business</h2>
            <ul className="mt-6 space-y-4">
              {s.benefits.map((b) => (
                <li key={b} className="flex gap-3 text-[1.02rem] text-ink/85">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-ink"><Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /></span>{b}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-h2 text-ink">What’s included</h2>
            <ul className="mt-6 divide-y divide-paper-line border-y border-paper-line">
              {s.scope.map((x) => <li key={x} className="py-3.5 text-[1.02rem] text-ink/85">{x}</li>)}
            </ul>
          </div>
        </Container>
      </section>

      <section className="bg-paper-grey py-16 lg:py-20">
        <Container>
          <h2 className="text-h2 text-ink">How we work</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {s.process.map((p, i) => (
              <li key={p.title} className="relative rounded-card bg-white p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-extrabold text-white tabular-nums">{i + 1}</span>
                <h3 className="mt-4 font-bold text-ink">{p.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{p.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <Container className="max-w-[52rem]">
          <h2 className="text-h2 text-ink">Questions about this service</h2>
          <div className="mt-8 divide-y divide-paper-line border-y border-paper-line">
            {s.faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[1.05rem] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  {f.q}
                  <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-paper-line text-lg leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-prose text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section id="enquiry" className="scroll-mt-24 bg-paper-grey py-16 lg:py-20">
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <h2 className="text-h2 text-ink">Start a {s.name.toLowerCase()} project</h2>
            <p className="mt-4 max-w-prose text-muted">Tell us what you need. We’ll reply within one working day with questions or a proposed next step.</p>
            <h3 className="mt-10 text-sm font-bold text-ink">Other services</h3>
            <ul className="mt-3 space-y-2">
              {others.map((o) => <li key={o.slug}><TextLink to={`/services/${o.slug}`}>{o.name}</TextLink></li>)}
            </ul>
          </div>
          <div className="rounded-card bg-white p-6 shadow-lift sm:p-8">
            <EnquiryForm key={s.slug} defaultService={s.name} />
          </div>
        </Container>
      </section>
    </>
  );
}
