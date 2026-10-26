import { Container, ButtonLink } from '../components/ui';
import { usePageMeta } from '../lib/seo';

export default function NotFound() {
  usePageMeta('Page not found', 'The page you were looking for does not exist.');
  return (
    <section className="bg-white py-24">
      <Container className="max-w-[36rem] text-center">
        <p className="text-sm font-semibold text-brand-deep">Error 404</p>
        <h1 className="mt-2 text-h2 text-ink">We couldn’t find that page</h1>
        <p className="mt-3 text-muted">The link may be old or mistyped. Try the store or our services.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/store">Go to the store</ButtonLink>
          <ButtonLink to="/services" variant="outline">See services</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
