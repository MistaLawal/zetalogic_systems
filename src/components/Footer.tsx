import { Link } from 'react-router-dom';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Logo } from './Logo';
import { Container } from './ui';
import { Newsletter } from './Newsletter';
import { categories, company, services } from '../config/site';
import { addressLine, mailHref, telHref, whatsappHref } from '../lib/contact';
import { useSettings } from '../context/SettingsContext';

const companyLinks = [
  { label: 'About us', to: '/about' },
  { label: 'Technology insights', to: '/blog' },
  { label: 'Track an order', to: '/track-order' },
  { label: 'Digital downloads', to: '/account/downloads' },
  { label: 'FAQs', to: '/faq' },
  { label: 'Contact', to: '/contact' },
];

const policies = [
  { label: 'Privacy policy', to: '/policies/privacy' },
  { label: 'Terms and conditions', to: '/policies/terms' },
  { label: 'Shipping and delivery', to: '/policies/shipping' },
  { label: 'Returns and refunds', to: '/policies/returns' },
  { label: 'Software licence policy', to: '/policies/software-licence' },
];

const socialLabels: Record<keyof typeof company.socials, string> = {
  instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X', facebook: 'Facebook',
};

function Col({ title, items }: { title: string; items: { label: string; to: string }[] }) {
  return (
    <div>
      <h3 className="text-[0.95rem] font-bold text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((i) => (
          <li key={i.to}>
            <Link to={i.to} className="text-[0.9rem] text-white/65 hover:text-white">{i.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const settings = useSettings();
  const socials = (Object.entries(settings.socials) as [keyof typeof company.socials, string][]).filter(([, url]) => url && /^https:\/\//.test(url));
  return (
    <footer className="bg-black text-white">
      <Newsletter />
      <Container className="grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1.2fr_1fr]">
        <div className="max-w-sm">
          <Link to="/" aria-label="Zetalogic Systems home"><Logo variant="white" className="w-[168px]" /></Link>
          <p className="mt-5 text-[0.92rem] leading-relaxed text-white/65">{company.statement}</p>
          <ul className="mt-6 space-y-3 text-[0.92rem]">
            <li><a href={telHref} className="flex items-center gap-3 text-white/85 hover:text-white"><Phone className="h-4 w-4 text-brand" aria-hidden="true" />{company.phoneDisplay}</a></li>
            <li><a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/85 hover:text-white"><MessageCircle className="h-4 w-4 text-brand" aria-hidden="true" />Chat on WhatsApp</a></li>
            <li><a href={mailHref} className="flex items-center gap-3 break-all text-white/85 hover:text-white"><Mail className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />{company.email}</a></li>
            <li className="flex items-start gap-3 text-white/85"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />{addressLine}</li>
          </ul>
          {socials.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-4 text-sm">
              {socials.map(([k, url]) => (
                <li key={k}><a href={url} target="_blank" rel="noopener noreferrer" className="text-white/65 hover:text-brand">{socialLabels[k]}</a></li>
              ))}
            </ul>
          )}
        </div>
        <Col title="Shop" items={[{ label: 'All products', to: '/store' }, ...categories.map((c) => ({ label: c.name, to: `/store/category/${c.slug}` }))]} />
        <Col title="Services" items={services.map((s) => ({ label: s.name, to: `/services/${s.slug}` }))} />
        <Col title="Company" items={companyLinks} />
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-4 py-6 text-[0.82rem] text-white/50 lg:flex-row lg:items-center lg:justify-between">
          <p>© {new Date().getFullYear()} {company.name}. {company.tagline}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {policies.map((p) => <li key={p.to}><Link to={p.to} className="hover:text-white">{p.label}</Link></li>)}
          </ul>
        </Container>
      </div>
    </footer>
  );
}
