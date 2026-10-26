import { PageHero } from '../components/PageHero';
import { Container, ButtonLink, TextLink } from '../components/ui';
import { usePageMeta } from '../lib/seo';

const groups = [
  { title: 'Productivity and office', body: 'Office suites, PDF tools and collaboration software for everyday work.' },
  { title: 'Security', body: 'Antivirus and endpoint protection for personal devices and office machines.' },
  { title: 'Business and accounting', body: 'Accounting, inventory and point-of-sale software, set up for how you trade.' },
  { title: 'Design and development', body: 'Creative and developer tools for designers, engineers and students.' },
];

const promises = [
  'Each licence lists its type, duration, number of devices and where it comes from.',
  'System requirements and compatibility are shown before you buy.',
  'Activation instructions are delivered with your order, and we can activate it for you.',
  'Refund eligibility for digital products is stated on each product page.',
];

export default function Software() {
  usePageMeta('Software solutions', 'Software licences, installation and activation support for individuals and businesses in Nigeria.');
  return (
    <>
      <PageHero
        title="Software solutions, with setup included when you need it"
        intro="Buy the software your work depends on, understand exactly what licence you’re getting, and get help installing it."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Software solutions' }]}
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/store/category/software-licences">Browse software</ButtonLink>
          <ButtonLink to="/services/software-installation" variant="outline">Installation and support</ButtonLink>
        </div>
      </PageHero>
      <section className="bg-white py-16 lg:py-20">
        <Container>
          <h2 className="text-h2 text-ink">What we can supply</h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {groups.map((g) => (
              <li key={g.title} className="border-t-2 border-brand pt-5">
                <h3 className="font-bold text-ink">{g.title}</h3>
                <p className="mt-2 text-[0.95rem] text-muted">{g.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <section className="bg-paper-grey py-16 lg:py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-h2 text-ink">Clear licensing, before you pay</h2>
            <p className="mt-4 max-w-prose text-muted">Software licences can be confusing. We show you what you’re buying so there are no surprises after activation.</p>
            <TextLink to="/policies/software-licence" className="mt-6 inline-block">Read our software licence policy</TextLink>
          </div>
          <ul className="space-y-3">
            {promises.map((p) => <li key={p} className="rounded-card bg-white p-5 text-ink/85">{p}</li>)}
          </ul>
        </Container>
      </section>
    </>
  );
}
