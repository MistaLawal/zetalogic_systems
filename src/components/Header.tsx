import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X, Phone, MessageCircle } from 'lucide-react';
import { Logo } from './Logo';
import { Container, ButtonLink } from './ui';
import { company, mainNav } from '../config/site';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { telHref, whatsappHref } from '../lib/contact';

function firstSentence(text: string) {
  const m = text.match(/^.*?[?.!](\s|$)/);
  return m ? m[0].trim() : text;
}

function AnnouncementBar() {
  const { announcement } = useSettings();
  if (!announcement.enabled || !announcement.text) return null;
  return (
    <div className="bg-ink text-white">
      <Container className="py-2 text-center text-[0.78rem] leading-snug sm:text-[0.8125rem]">
        <p className="text-white/85 [text-wrap:balance]">
          {/* Phones show the first sentence only so the bar stays one or two lines */}
          <span className="sm:hidden">{firstSentence(announcement.text)}</span>
          <span className="hidden sm:inline">{announcement.text}</span>{' '}
          <a
            href={whatsappHref('Hello Zetalogic, I need help choosing a laptop.')}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap font-semibold text-brand underline underline-offset-4 hover:text-white"
          >
            {announcement.link_label}
          </a>
        </p>
      </Container>
    </div>
  );
}

function SearchForm({ autoFocus, onDone, id }: { autoFocus?: boolean; onDone?: () => void; id: string }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/store?q=${encodeURIComponent(term)}` : '/store');
    onDone?.();
  };
  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <label htmlFor={id} className="sr-only">Search products</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search laptops, software, SKU…"
        className="h-10 w-full rounded-btn border border-paper-line bg-paper-grey pl-9 pr-3 text-sm text-ink placeholder:text-muted/80 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </form>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link relative inline-flex h-11 items-center whitespace-nowrap text-[0.92rem] font-semibold transition-colors ${
    isActive ? 'is-active text-ink' : 'text-ink/70 hover:text-ink'
  }`;

export function Header() {
  const { count } = useCart();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const menuBtn = useRef<HTMLButtonElement>(null);

  // Close overlays on navigation.
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [location.pathname, location.search]);

  // Lock scroll and support Escape while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuOpen(false); menuBtn.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  return (
    <>
      <AnnouncementBar />
      <header className="sticky-header sticky z-40 border-b border-paper-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        {/* Row 1: logo, search, account, cart, quote */}
        <Container className="flex h-[68px] items-center gap-3 lg:gap-6">
          <Link to="/" className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label="Zetalogic Systems home">
            <Logo className="w-[124px] sm:w-[148px]" />
          </Link>

          <div className="hidden max-w-xl flex-1 lg:block">
            <SearchForm id="search-desktop" />
          </div>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1 lg:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-btn text-ink hover:bg-paper-grey lg:hidden"
              aria-label="Search products"
              aria-expanded={searchOpen}
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Account: icon on small screens, icon + text on desktop */}
            {user ? (
              <Link to="/account" className="header-action group relative flex h-10 items-center gap-2 rounded-btn px-2.5 text-ink hover:bg-paper-grey" aria-label="Your account">
                <User className="h-5 w-5" aria-hidden="true" />
                <span aria-hidden="true" className="absolute left-[1.55rem] top-[0.55rem] h-2 w-2 rounded-full bg-brand ring-2 ring-white" />
                <span className="hidden whitespace-nowrap text-[0.9rem] font-semibold lg:inline">My account</span>
              </Link>
            ) : (
              <>
                <Link to="/account/sign-in" className="grid h-10 w-10 place-items-center rounded-btn text-ink hover:bg-paper-grey lg:hidden" aria-label="Sign in or create an account">
                  <User className="h-5 w-5" />
                </Link>
                <div className="hidden items-center gap-1 lg:flex">
                  <User className="mr-1 h-5 w-5 text-ink" aria-hidden="true" />
                  <Link to="/account/sign-in" className="whitespace-nowrap rounded-md px-1.5 py-1 text-[0.9rem] font-semibold text-ink hover:bg-paper-grey hover:text-brand-deep">Sign in</Link>
                  <span className="text-muted" aria-hidden="true">/</span>
                  <Link to="/account/sign-up" className="whitespace-nowrap rounded-md px-1.5 py-1 text-[0.9rem] font-semibold text-ink hover:bg-paper-grey hover:text-brand-deep">Create account</Link>
                </div>
              </>
            )}

            <Link to="/cart" className="relative flex h-10 items-center gap-2 rounded-btn px-2.5 text-ink hover:bg-paper-grey" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
              <span className="relative">
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                <span
                  aria-hidden="true"
                  className={`absolute -right-2.5 -top-2 grid min-w-[18px] place-items-center rounded-full px-1 text-[0.68rem] font-bold leading-[18px] tabular-nums ${count > 0 ? 'bg-brand text-ink' : 'bg-paper-line text-muted'}`}
                >
                  {count}
                </span>
              </span>
              <span className="hidden whitespace-nowrap pl-1 text-[0.9rem] font-semibold lg:inline">Cart</span>
            </Link>

            <ButtonLink to="/contact#enquiry" className="ml-1 hidden whitespace-nowrap !px-4 !py-2.5 md:inline-flex">Get a Quote</ButtonLink>

            <button
              ref={menuBtn}
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-btn text-ink hover:bg-paper-grey lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </Container>

        {/* Row 2 (desktop): main navigation on one line */}
        <div className="hidden border-t border-paper-line lg:block">
          <Container className="flex items-center justify-between gap-6">
            <nav aria-label="Main" className="flex items-center gap-7">
              {mainNav.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/services'} className={navClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <a href={telHref} className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[0.85rem] font-semibold text-ink/70 hover:text-brand-deep">
              <Phone className="h-4 w-4 text-brand-deep" aria-hidden="true" />{company.phoneDisplay}
            </a>
          </Container>
        </div>

        {searchOpen && (
          <div className="border-t border-paper-line bg-white lg:hidden">
            <Container className="py-3"><SearchForm id="search-mobile" autoFocus onDone={() => setSearchOpen(false)} /></Container>
          </div>
        )}
      </header>

      {menuOpen && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="mobile-sheet absolute inset-y-0 right-0 flex w-[min(88vw,380px)] flex-col bg-white shadow-2xl">
            <div className="flex h-[68px] items-center justify-between border-b border-paper-line px-5">
              <Logo className="w-[124px]" />
              <button autoFocus onClick={() => setMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-btn hover:bg-paper-grey" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
              {[{ label: 'Home', to: '/' }, ...mainNav].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/' || item.to === '/services'}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-btn px-3 py-3.5 text-[1.05rem] font-semibold ${isActive ? 'bg-brand-mist text-ink shadow-[inset_3px_0_0_#4CB748]' : 'text-ink/80 hover:bg-paper-grey'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="space-y-3 border-t border-paper-line p-5">
              {user ? (
                <ButtonLink to="/account" variant="outline" className="w-full"><User className="h-4 w-4" aria-hidden="true" />My account</ButtonLink>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <ButtonLink to="/account/sign-in" variant="outline" className="whitespace-nowrap !px-3">Sign in</ButtonLink>
                  <ButtonLink to="/account/sign-up" variant="dark" className="whitespace-nowrap !px-3">Create account</ButtonLink>
                </div>
              )}
              <ButtonLink to="/contact#enquiry" className="w-full">Get a Quote</ButtonLink>
              <div className="grid grid-cols-2 gap-3">
                <a href={telHref} className="flex items-center justify-center gap-2 rounded-btn border border-paper-line py-2.5 text-sm font-semibold"><Phone className="h-4 w-4" />Call</a>
                <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-btn border border-paper-line py-2.5 text-sm font-semibold"><MessageCircle className="h-4 w-4" />WhatsApp</a>
              </div>
              <p className="text-center text-xs text-muted">{company.phoneDisplay}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
