import { useState } from 'react';
import { Clock, Copy, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { Container, ButtonA } from '../components/ui';
import { EnquiryForm } from '../components/EnquiryForm';
import { company } from '../config/site';
import { addressLine, mailHref, telHref, whatsappHref } from '../lib/contact';
import { usePageMeta } from '../lib/seo';
import { useSettings } from '../context/SettingsContext';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1800); }).catch(() => {})}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.8rem] font-medium text-muted hover:bg-paper-grey hover:text-ink"
      aria-label={`Copy ${label}`}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden="true" />{done ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function Contact() {
  const { business_hours } = useSettings();
  usePageMeta('Contact us', `Call ${company.phoneDisplay}, chat on WhatsApp or email ${company.email}. Zetalogic Systems, Ikorodu, Lagos.`);
  return (
    <>
      <PageHero
        title="Talk to Zetalogic Systems"
        intro="Ask about a product, get a quote, or get help with something you bought. WhatsApp is usually the fastest way to reach us."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Contact' }]}
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonA href={whatsappHref('Hello Zetalogic Systems, I have a question.')}><MessageCircle className="h-4 w-4" aria-hidden="true" />Chat on WhatsApp</ButtonA>
          <ButtonA href={telHref} variant="outline"><Phone className="h-4 w-4" aria-hidden="true" />Call {company.phoneDisplay}</ButtonA>
        </div>
      </PageHero>

      <section className="bg-white py-16 lg:py-20">
        <Container className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <aside className="space-y-8">
            <ul className="divide-y divide-paper-line rounded-card border border-paper-line">
              <li className="flex items-start gap-4 p-5">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-deep" aria-hidden="true" />
                <div className="min-w-0 flex-1"><p className="text-sm text-muted">Phone</p><a href={telHref} className="font-semibold text-ink hover:underline">{company.phoneDisplay}</a></div>
                <CopyButton value={company.phoneTel} label="phone number" />
              </li>
              <li className="flex items-start gap-4 p-5">
                <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-deep" aria-hidden="true" />
                <div className="min-w-0 flex-1"><p className="text-sm text-muted">WhatsApp</p><a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink hover:underline">+234 702 630 7814</a></div>
              </li>
              <li className="flex items-start gap-4 p-5">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-deep" aria-hidden="true" />
                <div className="min-w-0 flex-1"><p className="text-sm text-muted">Email</p><a href={mailHref} className="break-all font-semibold text-ink hover:underline">{company.email}</a></div>
                <CopyButton value={company.email} label="email address" />
              </li>
              <li className="flex items-start gap-4 p-5">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-deep" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted">Address</p>
                  <p className="font-semibold text-ink">{addressLine}</p>
                  <p className="mt-1 text-[0.82rem] text-muted">Visits by appointment. Message us before coming.</p>
                </div>
              </li>
            </ul>
            <div>
              <h2 className="flex items-center gap-2 font-bold text-ink"><Clock className="h-4 w-4 text-brand-deep" aria-hidden="true" />Business hours (WAT)</h2>
              <dl className="mt-3 divide-y divide-paper-line border-y border-paper-line text-[0.95rem]">
                {business_hours.map((h) => (
                  <div key={h.days} className="flex justify-between py-2.5"><dt className="text-muted">{h.days}</dt><dd className="font-medium text-ink tabular-nums">{h.time}</dd></div>
                ))}
              </dl>
            </div>
          </aside>

          <div id="enquiry" className="scroll-mt-24">
            <h2 className="text-h2 text-ink">Send a project enquiry</h2>
            <p className="mt-3 max-w-prose text-muted">For websites, software, consulting or IT support. We reply within one working day.</p>
            <div className="mt-8 rounded-card border border-paper-line p-6 sm:p-8">
              <EnquiryForm />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
