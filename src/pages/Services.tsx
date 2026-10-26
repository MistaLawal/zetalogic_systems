import { Link } from 'react-router-dom';
import { PageHero } from '../components/PageHero';
import { Container, ButtonLink } from '../components/ui';
import { Icon } from '../components/Icon';
import { services } from '../config/site';
import { usePageMeta } from '../lib/seo';

export default function Services() {
  usePageMeta('IT services', 'Website design, custom web applications, IT consulting, automation, data analytics, software installation and computer support in Lagos.');
  return (
    <>
      <PageHero
        title="IT services that fit how your business works"
        intro="Every engagement starts with a conversation and a written quote in naira. Pick a service to see what’s included and how we work."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'IT services' }]}
      >
        <ButtonLink to="/contact#enquiry" className="mt-8">Discuss your project</ButtonLink>
      </PageHero>
      <section className="bg-white py-16 lg:py-24">
        <Container>
          <ul className="grid gap-px overflow-hidden rounded-card border border-paper-line bg-paper-line md:grid-cols-2">
            {services.map((s) => (
              <li key={s.slug} className="bg-white">
                <Link to={`/services/${s.slug}`} className="group flex h-full flex-col p-7 hover:bg-brand-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand lg:p-9">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-paper-grey text-ink group-hover:bg-brand"><Icon name={s.icon} className="h-6 w-6" /></span>
                  <h2 className="mt-5 text-h3 text-ink">{s.name}</h2>
                  <p className="mt-2 text-muted">{s.short}</p>
                  <ul className="mt-5 space-y-1.5 text-[0.9rem] text-ink/80">
                    {s.scope.slice(0, 3).map((x) => <li key={x} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />{x}</li>)}
                  </ul>
                  <span className="mt-auto pt-6 text-[0.92rem] font-semibold text-brand-deep group-hover:underline">Learn more</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
