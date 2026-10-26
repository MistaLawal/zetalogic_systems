import { PageHero } from '../components/PageHero';
import { Container, ButtonLink, ButtonA, TextLink } from '../components/ui';
import { Icon } from '../components/Icon';
import { categories, company, services } from '../config/site';
import { usePageMeta } from '../lib/seo';
import { whatsappHref } from '../lib/contact';

const coreValues = [
  { title: 'Honesty', body: 'We describe products as they are, including the condition of used devices, and we tell you when you don’t need to spend more.' },
  { title: 'Practicality', body: 'We recommend technology you will actually use, sized to your work and budget.' },
  { title: 'Clarity', body: 'Written quotes, plain explanations and no surprise charges.' },
  { title: 'Reliability', body: 'We do what we agreed, when we agreed, and we stay reachable after the sale.' },
];

const approach = [
  { title: 'Understand the work', body: 'We start with what you do every day and what is getting in the way, not with a product.' },
  { title: 'Recommend options', body: 'You get a short list of options with prices and trade-offs, so the decision stays yours.' },
  { title: 'Deliver and set up', body: 'We supply, install or build what you chose and confirm it works in your setting.' },
  { title: 'Support afterwards', body: 'We remain available for questions, fixes and the next step as your needs grow.' },
];

export default function About() {
  usePageMeta('About us', 'Zetalogic Systems is a Lagos technology company supplying laptops, software and digital products, and delivering websites, IT consulting and support.');
  return (
    <>
      <PageHero
        title="A technology partner for Nigerian businesses and professionals"
        intro={`${company.name} supplies computers, software and digital tools, and delivers websites, automation and IT support from ${company.address.area}, ${company.address.city}.`}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'About us' }]}
      />

      <section className="bg-white py-16 lg:py-24">
        <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="text-h2 text-ink">Who we are</h2>
            <div className="mt-5 max-w-prose space-y-4 text-lead text-muted">
              <p>{company.statement}</p>
              <p>We bring hardware, software and services under one roof, so the laptop you buy, the licence on it and the website or system it runs can come from one team that understands how they fit together.</p>
              <p>We work with individuals buying their next device as well as organisations planning a website, a new system or an office setup.</p>
            </div>
          </div>
          <div className="grid gap-px self-start overflow-hidden rounded-card border border-paper-line bg-paper-line">
            <div className="bg-white p-7">
              <h3 className="text-sm font-bold text-brand-deep">Our mission</h3>
              <p className="mt-2 text-[1.15rem] font-semibold leading-snug text-ink">To give businesses and individuals practical, reliable technology and the support to use it well.</p>
            </div>
            <div className="bg-white p-7">
              <h3 className="text-sm font-bold text-brand-deep">Our vision</h3>
              <p className="mt-2 text-[1.15rem] font-semibold leading-snug text-ink">To be the technology partner Nigerian businesses trust to help them work smarter and grow confidently.</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-paper-grey py-16 lg:py-24">
        <Container>
          <h2 className="text-h2 text-ink">What we value</h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {coreValues.map((v) => (
              <li key={v.title} className="border-t-2 border-ink pt-5">
                <h3 className="text-h3 text-ink">{v.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{v.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="bg-white py-16 lg:py-24">
        <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="text-h2 text-ink">What we sell</h2>
            <ul className="mt-8 space-y-4">
              {categories.map((c) => (
                <li key={c.slug} className="flex gap-4">
                  <Icon name={c.icon} className="mt-0.5 h-5 w-5 shrink-0 text-brand-deep" />
                  <div><p className="font-semibold text-ink">{c.name}</p><p className="text-[0.92rem] text-muted">{c.blurb}</p></div>
                </li>
              ))}
            </ul>
            <ButtonLink to="/store" variant="dark" className="mt-8">Explore the store</ButtonLink>
          </div>
          <div>
            <h2 className="text-h2 text-ink">What we do</h2>
            <ul className="mt-8 space-y-4">
              {services.map((s) => (
                <li key={s.slug} className="flex gap-4">
                  <Icon name={s.icon} className="mt-0.5 h-5 w-5 shrink-0 text-brand-deep" />
                  <div><p className="font-semibold text-ink">{s.name}</p><p className="text-[0.92rem] text-muted">{s.short}</p></div>
                </li>
              ))}
            </ul>
            <TextLink to="/services" className="mt-8 inline-block">See all services</TextLink>
          </div>
        </Container>
      </section>

      <section className="bg-paper-grey py-16 lg:py-24">
        <Container>
          <h2 className="text-h2 text-ink">How we solve technology problems</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {approach.map((a, i) => (
              <li key={a.title} className="rounded-card bg-white p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-extrabold text-ink tabular-nums">{i + 1}</span>
                <h3 className="mt-4 font-bold text-ink">{a.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{a.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="bg-white py-16 lg:py-24">
        <Container className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <h2 className="text-h2 text-ink">Our commitment to you</h2>
            <ul className="mt-6 max-w-prose space-y-3 text-[1.02rem] text-muted">
              <li>Product pages that state price, condition, warranty and stock clearly.</li>
              <li>Payments processed by a licensed payment provider. We never store your card details.</li>
              <li>A written quote before any service work begins.</li>
              <li>A real person on the phone, WhatsApp or email when you need help.</li>
            </ul>
          </div>
          <div className="rounded-card bg-ink p-8 text-white">
            <h3 className="text-h3">Not sure where to start?</h3>
            <p className="mt-2 text-white/70">Describe what you need and we’ll suggest a sensible next step.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/contact#enquiry">Request a consultation</ButtonLink>
              <ButtonA href={whatsappHref()} variant="ghostLight">Chat on WhatsApp</ButtonA>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
