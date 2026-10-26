import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { Container, ButtonA, ButtonLink } from '../components/ui';
import { whatsappHref } from '../lib/contact';
import { usePageMeta } from '../lib/seo';

// Routes that later phases will build (store, account, policies, blog…).
const names: [RegExp, string, string][] = [
  [/^\/cart/, 'Your cart', 'Review items, change quantities and check out securely.'],
  [/^\/checkout/, 'Checkout', 'Pay securely by card or bank transfer through Paystack.'],
  [/^\/track-order/, 'Order tracking', 'Check where your delivery is.'],
  [/^\/blog/, 'Technology insights', 'Guides on laptops, software, security and automation.'],
  [/^\/faq/, 'Frequently asked questions', 'Answers on orders, delivery, payments and warranties.'],
  [/^\/policies/, 'Store policies', 'Privacy, terms, shipping, returns and software licensing.'],
];

export default function Upcoming() {
  const { pathname } = useLocation();
  const [, title, body] = names.find(([re]) => re.test(pathname)) ?? [null, 'Page in progress', 'This page is being prepared.'];
  usePageMeta(title, body);
  return (
    <section className="bg-paper-grey py-20 lg:py-28">
      <Container className="max-w-[40rem] text-center">
        <h1 className="text-h2 text-ink">{title}</h1>
        <p className="mt-3 text-lead text-muted">{body}</p>
        <p className="mt-6 text-[0.95rem] text-muted">This part of the site opens soon. In the meantime we can help you directly.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonA href={whatsappHref(`Hello Zetalogic, I need help with: ${title.toLowerCase()}.`)}><MessageCircle className="h-4 w-4" aria-hidden="true" />Ask on WhatsApp</ButtonA>
          <ButtonLink to="/" variant="outline">Back to home</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
