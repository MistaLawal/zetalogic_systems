import { Link } from 'react-router-dom';
import { Laptop, Globe, KeyRound, Wrench, ChevronRight } from 'lucide-react';
import { Container, ButtonLink } from '../components/ui';
import mark from '../assets/mark.png';

const paths = [
  { icon: Laptop, label: 'Buy a laptop', sub: 'New, used and refurbished', to: '/store/category/new-laptops' },
  { icon: Globe, label: 'Build a website', sub: 'Company sites and stores', to: '/services/web-development' },
  { icon: KeyRound, label: 'Get software', sub: 'Licences and setup', to: '/store/category/software-licences' },
  { icon: Wrench, label: 'Fix or set up IT', sub: 'Devices and networks', to: '/services/it-support' },
];

/** A clean line-drawn laptop whose screen shows a simple business dashboard. */
function LaptopArt() {
  const bars = [46, 70, 58, 92, 80, 118, 104];
  return (
    <svg viewBox="0 0 520 330" className="h-auto w-full drop-shadow-[0_30px_40px_rgba(16,16,16,0.25)]" role="img" aria-label="Laptop showing a business sales dashboard">
      <rect x="58" y="6" width="404" height="262" rx="14" fill="#101010" />
      <rect x="72" y="20" width="376" height="234" rx="4" fill="#FFFFFF" />
      {/* window bar */}
      <rect x="72" y="20" width="376" height="22" rx="4" fill="#F3F5F4" />
      <circle cx="86" cy="31" r="3.5" fill="#D5DAD8" /><circle cx="98" cy="31" r="3.5" fill="#D5DAD8" /><circle cx="110" cy="31" r="3.5" fill="#D5DAD8" />
      <image href={mark} x="414" y="23" width="17" height="17" />
      {/* sidebar */}
      <rect x="72" y="42" width="70" height="212" fill="#F7F9F8" />
      {[60, 80, 100, 120, 140].map((y, i) => (
        <rect key={y} x="84" y={y} width={i === 1 ? 44 : 36} height="7" rx="3.5" fill={i === 1 ? '#4CB748' : '#DCE1DF'} />
      ))}
      {/* KPI tiles */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={156 + i * 96} y="54" width="84" height="44" rx="6" fill="#F3F5F4" />
          <rect x={166 + i * 96} y="64" width="34" height="5" rx="2.5" fill="#B9C0BD" />
          <rect x={166 + i * 96} y="76" width={i === 0 ? 52 : 44} height="10" rx="3" fill="#101010" />
        </g>
      ))}
      {/* bar chart */}
      <rect x="156" y="110" width="276" height="132" rx="6" fill="#F3F5F4" />
      {[150, 180, 210].map((y) => <line key={y} x1="168" x2="420" y1={y} y2={y} stroke="#E2E6E4" strokeWidth="1" />)}
      {bars.map((h, i) => (
        <rect key={i} x={176 + i * 34} y={232 - h} width="20" height={h} rx="3" fill={i === 5 ? '#4CB748' : '#101010'} opacity={i === 5 ? 1 : 0.85} />
      ))}
      {/* base */}
      <path d="M18 270 H502 L486 296 Q482 302 472 302 H48 Q38 302 34 296 Z" fill="#D9DEDC" />
      <rect x="226" y="270" width="68" height="7" rx="3.5" fill="#BFC6C3" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <Container className="grid items-center gap-12 pb-16 pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-24 lg:pt-20">
        <div className="hero-copy relative z-10 max-w-[38rem]">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-paper-line bg-paper-grey px-3 py-1 text-[0.8rem] font-medium text-ink/75">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
            Laptops, software and IT services in Lagos
          </p>
          <h1 className="text-display text-ink [text-wrap:balance]">Technology solutions built around your business.</h1>
          <p className="mt-6 max-w-[34rem] text-lead text-muted">
            From professional websites and business software to reliable laptops and digital tools, Zetalogic Systems helps you find the right technology for your next step.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/store" className="!px-6 !py-3.5">Explore our store</ButtonLink>
            <ButtonLink to="/contact#enquiry" variant="outline" className="!px-6 !py-3.5">Discuss your project</ButtonLink>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
          {/* Angled panel echoing the triangle in the Zetalogic mark */}
          <div aria-hidden="true" className="brand-wedge absolute -right-4 -top-6 bottom-10 left-8 bg-brand sm:left-16 lg:-right-24 lg:left-10" />
          <div className="hero-art relative px-2 pt-10 sm:px-6">
            <LaptopArt />
          </div>
          <nav aria-label="Popular starting points" className="relative z-10 -mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-paper-line bg-paper-line shadow-lift sm:mx-6 lg:-ml-10 lg:mr-6">
            {paths.map(({ icon: I, label, sub, to }) => (
              <Link key={to} to={to} className="group flex items-center gap-3 bg-white p-3.5 hover:bg-brand-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paper-grey text-ink group-hover:bg-brand"><I className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                <span className="min-w-0">
                  <span className="block text-[0.9rem] font-semibold leading-tight text-ink">{label}</span>
                  <span className="hidden truncate text-[0.78rem] text-muted sm:block">{sub}</span>
                </span>
                <ChevronRight className="ml-auto hidden h-4 w-4 shrink-0 text-muted group-hover:text-ink sm:block" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </div>
      </Container>
    </section>
  );
}
