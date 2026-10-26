import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MessageCircle, PackageSearch, Newspaper, MessageSquareQuote, ArrowUpRight } from 'lucide-react';
import { Container, SectionHead, ButtonLink, ButtonA, TextLink } from '../components/ui';
import { Icon } from '../components/Icon';
import { ProductCard, ProductGridSkeleton } from '../components/ProductCard';
import { categories, services, values } from '../config/site';
import { useCollection, type Collection } from '../data/useCollection';
import type { PostSummary, ProductSummary, Testimonial } from '../types/catalog';
import { whatsappHref } from '../lib/contact';

/* C. Shop by category — one ruled grid rather than floating cards */
export function ShopByCategory() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <Container>
        <SectionHead
          title="Shop by category"
          intro="Hardware you can hold, software you can activate, and tools you can download."
          action={<TextLink to="/store">View all products</TextLink>}
        />
        <ul className="grid gap-px overflow-hidden rounded-card border border-paper-line bg-paper-line sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.slug} className="bg-white">
              <Link to={`/store/category/${c.slug}`} className="group flex h-full gap-4 p-6 hover:bg-brand-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand lg:p-7">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper-grey text-ink transition-colors group-hover:bg-brand">
                  <Icon name={c.icon} className="h-6 w-6" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[1.05rem] font-bold text-ink">
                    {c.name}
                    <ArrowUpRight className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                  </span>
                  <span className="mt-1.5 block text-[0.92rem] leading-relaxed text-muted">{c.blurb}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* Shared empty state for database-driven sections */
function EmptyPanel({ icon: I, title, body, action }: { icon: typeof PackageSearch; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-5 rounded-card border border-dashed border-ink/15 bg-white p-8 sm:flex-row sm:items-center">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand-deep"><I className="h-6 w-6" aria-hidden="true" /></span>
      <div className="flex-1">
        <h3 className="font-bold text-ink">{title}</h3>
        <p className="mt-1 max-w-prose text-[0.95rem] text-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}

function ProductCollection({ name, emptyTitle, emptyBody }: { name: Collection; emptyTitle: string; emptyBody: string }) {
  const data = useCollection<ProductSummary>(name);
  if (data.status === 'loading') return <ProductGridSkeleton />;
  if (data.status === 'error') return <p role="alert" className="text-muted">{data.message}</p>;
  if (data.items.length === 0)
    return (
      <EmptyPanel
        icon={PackageSearch}
        title={emptyTitle}
        body={emptyBody}
        action={<ButtonA href={whatsappHref('Hello Zetalogic, what laptops and accessories do you have in stock?')} variant="dark"><MessageCircle className="h-4 w-4" aria-hidden="true" />Ask about stock</ButtonA>}
      />
    );
  return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{data.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>;
}

/* D. Featured products */
export function FeaturedProducts() {
  return (
    <section className="bg-paper-grey py-16 lg:py-24">
      <Container>
        <SectionHead title="Featured products" intro="Prices in naira, with stock and condition shown on every item." action={<TextLink to="/store">View all products</TextLink>} />
        <ProductCollection
          name="featured"
          emptyTitle="Our online catalogue is being stocked"
          emptyBody="Products will appear here as they are listed. Until then, message us with what you need and we’ll send current options and prices."
        />
      </Container>
    </section>
  );
}

/* E. IT services — a two-column index, not a card wall */
export function ServicesIndex() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-h2 text-ink">IT services for businesses and professionals</h2>
          <p className="mt-4 max-w-prose text-lead text-muted">We plan, build and support the technology behind your work, and we quote in naira before we start.</p>
          <ButtonLink to="/services" variant="dark" className="mt-8">See all services</ButtonLink>
        </div>
        <ul className="divide-y divide-paper-line border-y border-paper-line">
          {services.map((s) => (
            <li key={s.slug}>
              <Link to={`/services/${s.slug}`} className="group grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <span className="row-span-2 grid h-11 w-11 place-items-center rounded-xl border border-paper-line text-ink group-hover:border-brand group-hover:bg-brand sm:row-span-1">
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[1.1rem] font-bold text-ink">{s.name}</span>
                  <span className="mt-1 block text-[0.94rem] text-muted">{s.short}</span>
                </span>
                <span className="col-start-2 text-[0.9rem] font-semibold text-brand-deep group-hover:underline sm:col-start-3">Learn more</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* F. Why choose Zetalogic */
export function WhyUs() {
  return (
    <section className="bg-paper-grey py-16 lg:py-24">
      <Container>
        <SectionHead title="Why people choose Zetalogic Systems" intro="What you can expect when you buy from us or hire us." />
        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v, i) => (
            <li key={v.title} className={`flex gap-4 ${i === values.length - 1 ? 'lg:col-span-1' : ''}`}>
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-ink"><Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /></span>
              <div>
                <h3 className="font-bold text-ink">{v.title}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">{v.body}</p>
              </div>
            </li>
          ))}
          <li className="flex items-center sm:col-span-2 lg:col-span-1">
            <TextLink to="/about">Read about how we work</TextLink>
          </li>
        </ul>
      </Container>
    </section>
  );
}

/* G. Business solutions banner */
export function BusinessBanner() {
  return (
    <section className="bg-white py-16 lg:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-[20px] bg-ink px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-16">
          <div aria-hidden="true" className="brand-wedge absolute -bottom-10 right-[-12%] top-[-20%] hidden w-[46%] bg-brand md:block" />
          <div className="relative max-w-[36rem]">
            <h2 className="text-h2 text-white">Running your business on spreadsheets and WhatsApp?</h2>
            <p className="mt-4 text-lead text-white/70">
              We build websites, custom systems and automations that save your team hours each week. Tell us how you work today and we’ll suggest a practical next step.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2 text-[0.85rem]">
              {['Business websites', 'Automation', 'IT consulting', 'Custom software'].map((t) => (
                <li key={t} className="rounded-full border border-white/20 px-3 py-1 text-white/85">{t}</li>
              ))}
            </ul>
            <ButtonLink to="/contact#enquiry" className="mt-8 !px-6 !py-3.5">Request a consultation</ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* H. New arrivals and special offers */
export function ArrivalsAndOffers() {
  const [tab, setTab] = useState<'new-arrivals' | 'offers'>('new-arrivals');
  const tabs = [{ id: 'new-arrivals', label: 'New arrivals' }, { id: 'offers', label: 'Special offers' }] as const;
  return (
    <section className="bg-paper-grey py-16 lg:py-24">
      <Container>
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-h2 text-ink">Just in and on offer</h2>
          <div role="tablist" aria-label="Product collections" className="inline-flex rounded-btn border border-paper-line bg-white p-1">
            {tabs.map((t) => (
              <button
                key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="panel-collection"
                onClick={() => setTab(t.id)}
                className={`rounded-[7px] px-4 py-2 text-[0.9rem] font-semibold ${tab === t.id ? 'bg-ink text-white' : 'text-ink/70 hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div role="tabpanel" id="panel-collection" aria-labelledby={`tab-${tab}`}>
          <ProductCollection
            key={tab}
            name={tab}
            emptyTitle={tab === 'offers' ? 'No offers running right now' : 'New stock is on the way'}
            emptyBody={tab === 'offers' ? 'Discounts show here with the original and sale price, and end automatically when the offer closes.' : 'Recently added laptops, accessories and digital products will show here.'}
          />
        </div>
      </Container>
    </section>
  );
}

/* I. Customer feedback — verified entries only, added by an administrator */
export function Testimonials() {
  const data = useCollection<Testimonial>('testimonials');
  if (data.status !== 'ready') return null;
  return (
    <section className="bg-white py-16 lg:py-24">
      <Container>
        <SectionHead title="What customers say" />
        {data.items.length === 0 ? (
          <EmptyPanel
            icon={MessageSquareQuote}
            title="Bought from us or worked with us?"
            body="We publish feedback only from verified customers. Tell us how it went and, with your permission, we’ll add it here."
            action={<ButtonA href={whatsappHref('Hello Zetalogic, I would like to share feedback.')} variant="outline">Share feedback</ButtonA>}
          />
        ) : (
          <ul className="grid gap-6 md:grid-cols-3">
            {data.items.map((t) => (
              <li key={t.id}>
                <figure className="h-full rounded-card border border-paper-line p-6">
                  <blockquote className="text-ink">“{t.quote}”</blockquote>
                  <figcaption className="mt-4 text-sm text-muted"><span className="font-semibold text-ink">{t.name}</span>{t.context ? `, ${t.context}` : ''}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

/* J. Technology insights */
export function Insights() {
  const data = useCollection<PostSummary>('posts');
  const topics = ['Laptop buying guides', 'Software', 'Cybersecurity', 'Business automation', 'Web development', 'Tech tips'];
  return (
    <section className="border-t border-paper-line bg-white py-16 lg:py-24">
      <Container>
        <SectionHead title="Technology insights" intro="Plain-language guides for buying, securing and getting more from your technology." action={<TextLink to="/blog">All articles</TextLink>} />
        {data.status === 'ready' && data.items.length > 0 ? (
          <ul className="grid gap-8 md:grid-cols-3">
            {data.items.slice(0, 3).map((p) => (
              <li key={p.id}>
                <Link to={`/blog/${p.slug}`} className="group block">
                  <p className="text-sm font-semibold text-brand-deep">{p.topic}</p>
                  <h3 className="mt-2 text-h3 text-ink group-hover:underline">{p.title}</h3>
                  <p className="mt-2 text-muted">{p.excerpt}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : data.status === 'loading' ? null : (
          <EmptyPanel
            icon={Newspaper}
            title="Our first guides are being written"
            body={`Coming up: ${topics.join(', ').toLowerCase()}. Subscribe below to get them by email.`}
          />
        )}
      </Container>
    </section>
  );
}
